"""Package Quaternius' CC0 male/female bases and hair as self-contained Studio GLBs.
Usage: python3 scripts/studio/build-alex-model.py '/path/Universal Base Characters[Standard]' [alex|sarah]
No downloaded code is executed. Original UVs, skin weights and face geometry are preserved.
"""
import copy, json, pathlib, struct, sys, subprocess, tempfile
character=sys.argv[2] if len(sys.argv)>2 else 'alex'
if character not in ['alex','sarah']:raise ValueError('Choose alex or sarah')
female=character=='sarah';title=character.title();sex='Female' if female else 'Male';mouth_y=1.5844 if female else 1.622;neck_y=1.475 if female else 1.51;shoulder_y=1.55 if female else 1.59
root=pathlib.Path(sys.argv[1]); base=root/'Base Characters/Godot - UE'; hair=root/'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)'
j=json.loads((base/f'Superhero_{sex}_FullBody.gltf').read_text()); data=bytearray((base/j['buffers'][0]['uri']).read_bytes())
def append(raw):
 while len(data)%4:data.append(0)
 idx=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':len(data),'byteLength':len(raw)});data.extend(raw);return idx
def texture_bytes(source):
 # Asset compilation: encode original maps at 1K for a lightweight web model.
 with tempfile.TemporaryDirectory() as td:
  dst=pathlib.Path(td)/'map.jpg'
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-vf','scale=1024:1024','-q:v','2',str(dst)],check=True)
  return dst.read_bytes()
def accessor(raw,typ,component,count,minimum=None,maximum=None):
 a={'bufferView':append(raw),'componentType':component,'count':count,'type':typ}
 if minimum is not None:a.update(min=minimum,max=maximum)
 idx=len(j['accessors']);j['accessors'].append(a);return idx
def read(idx):
 a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']]; n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt={5126:'f',5123:'H',5125:'I',5121:'B'}[a['componentType']];size=struct.calcsize(fmt)*n;off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',size)
 return [struct.unpack_from('<'+fmt*n,data,off+i*stride) for i in range(a['count'])]
# Use the author's matching light skin texture, never the unrelated photograph.
for img in j['images']:
 name=img['uri'].replace('_Normal_png','_Normal')
 source=base/name
 if 'Male_Dark' in name:source=root/'Base Characters/Textures/T_Superhero_Male_Ligh.png'
 if 'Female_Dark' in name:source=root/'Base Characters/Textures/T_Superhero_Female_Light_BaseColor.png'
 img.pop('uri');img['mimeType']='image/jpeg';img['bufferView']=append(texture_bytes(source))
# Hair uses the same joint ordering. Bind it to the selected character skeleton.
h=json.loads((hair/('Hair_Long.gltf' if female else 'Hair_SimpleParted.gltf')).read_text());hd=(hair/h['buffers'][0]['uri']).read_bytes();vo=len(j['bufferViews']);ao=len(j['accessors']);to=len(j['textures']);io=len(j['images']);so=len(j.get('samplers',[]));mo=len(j['materials'])
for v in h['bufferViews']:
 nv=copy.deepcopy(v);nv['buffer']=0;nv['byteOffset']=len(data)+(4-len(data)%4)%4+v.get('byteOffset',0);j['bufferViews'].append(nv)
while len(data)%4:data.append(0)
data.extend(hd)
for a in h['accessors']:
 a=copy.deepcopy(a);a['bufferView']+=vo;j['accessors'].append(a)
for img in h['images']:
 img=copy.deepcopy(img);source=hair/img.pop('uri');img['mimeType']='image/jpeg';img['bufferView']=append(texture_bytes(source));j['images'].append(img)
for t in h['textures']:
 t=copy.deepcopy(t);t['source']+=io
 if 'sampler' in t:t['sampler']+=so
 j['textures'].append(t)
j.setdefault('samplers',[]).extend(h.get('samplers',[]))
for m in h['materials']:
 m=copy.deepcopy(m)
 for key in ['normalTexture','occlusionTexture','emissiveTexture']:
  if key in m:m[key]['index']+=to
 for key in ['baseColorTexture','metallicRoughnessTexture']:
  if key in m.get('pbrMetallicRoughness',{}):m['pbrMetallicRoughness'][key]['index']+=to
 j['materials'].append(m)
for m in h['meshes']:
 m=copy.deepcopy(m)
 for p in m['primitives']:
  p['attributes']={k:v+ao for k,v in p['attributes'].items()};p['indices']+=ao;p['material']+=mo
 idx=len(j['meshes']);j['meshes'].append(m);ni=len(j['nodes']);j['nodes'].append({'name':title+('_Long_Hair' if female else '_Parted_Hair'),'mesh':idx,'skin':0});j['nodes'][68]['children'].append(ni)
# Split clothing boundaries geometrically, preserving interpolated UVs and skin weights.
p=j['meshes'][2]['primitives'][0]
attrs={k:read(v) for k,v in p['attributes'].items() if k in ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0']}
tri=read(p['indices']);parts=[[],[],[],[]]
planes=[(1,0,-.45),(1,0,.45),(1,0,0),(0,1,.115),(0,1,.99),(0,1,shoulder_y),(0,1,mouth_y),(-.65,1,neck_y),(.65,1,neck_y)]
def interpolate(a,b,t):
 v={k:tuple(x+(y-x)*t for x,y in zip(a[k],b[k])) for k in ['POSITION','NORMAL','TEXCOORD_0']}
 weights={}
 for src,f in [(a,1-t),(b,t)]:
  for joint,w in zip(src['JOINTS_0'],src['WEIGHTS_0']):weights[joint]=weights.get(joint,0)+w*f
 chosen=sorted(weights.items(),key=lambda a:-a[1])[:4];chosen+= [(0,0)]*(4-len(chosen));total=sum(w for _,w in chosen) or 1
 v['JOINTS_0']=tuple(k for k,_ in chosen);v['WEIGHTS_0']=tuple(w/total for _,w in chosen)
 return v
def split(poly,plane,sign):
 ax,ay,d=plane;out=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  da=(ax*a['POSITION'][0]+ay*a['POSITION'][1]-d)*sign;db=(ax*b['POSITION'][0]+ay*b['POSITION'][1]-d)*sign
  if da>=-1e-8:out.append(a)
  if (da>1e-8 and db < -1e-8) or (da < -1e-8 and db>1e-8):out.append(interpolate(a,b,da/(da-db)))
 return out
for i in range(0,len(tri),3):
 polygons=[[{k:v[tri[i+n][0]] for k,v in attrs.items()} for n in range(3)]]
 for plane in planes:
  next_polys=[]
  for poly in polygons:
   values=[plane[0]*v['POSITION'][0]+plane[1]*v['POSITION'][1]-plane[2] for v in poly]
   if min(values)<-1e-8 and max(values)>1e-8:next_polys.extend(p for p in [split(poly,plane,1),split(poly,plane,-1)] if len(p)>=3)
   else:next_polys.append(poly)
  polygons=next_polys
 for poly in polygons:
  x,y,z=[sum(v['POSITION'][c] for v in poly)/len(poly) for c in range(3)]
  mat=3 if y<.115 else 2 if y<.99 else 1 if (y<shoulder_y and y<neck_y+.65*abs(x) and abs(x)<.45) else 0
  for n in range(1,len(poly)-1):parts[mat].extend([{**v,'lowerLip':y<mouth_y} for v in [poly[0],poly[n],poly[n+1]]])
materials=[2]
for name,color in [(title+'_Shirt',[.30,.095,.055,1] if female else [.045,.105,.15,1]),(title+'_Trousers',[.035,.043,.06,1]),(title+'_Shoes',[.018,.021,.026,1])]:
 materials.append(len(j['materials']));j['materials'].append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':color,'roughnessFactor':.86,'metallicFactor':0},'doubleSided':True})
j['meshes'][2]['primitives']=[]
for k,vertices in enumerate(parts):
 pp={'attributes':{},'material':materials[k]}
 for key in attrs:
  n=len(vertices[0][key]);fmt='H' if key=='JOINTS_0' else 'f';values=[v[key] for v in vertices];minimum=[min(v[c] for v in values) for c in range(n)] if key=='POSITION' else None;maximum=[max(v[c] for v in values) for c in range(n)] if minimum else None
  pp['attributes'][key]=accessor(b''.join(struct.pack('<'+fmt*n,*v) for v in values),'VEC'+str(n),5123 if fmt=='H' else 5126,len(vertices),minimum,maximum)
 # Basic speech deformations; the source asset does not include authored facial blendshapes.
 pp['targets']=[]
 for shape in ['jawOpen','mouthPucker']:
  values=[]
  for v in vertices:
   x,y,z=v['POSITION'];dx=dy=dz=0
   if k==0 and mouth_y-.062<y<mouth_y+.028 and z>.025:
    lateral=max(0,1-(abs(x)/.072)**2);front=min(1,max(0,(z-.025)/.055))
    if shape=='jawOpen' and y<=mouth_y+.0000001 and v['lowerLip']:
     seam=max(0,1-(abs(x)/.032)**2)**2
     blend=min(1,max(0,(mouth_y-y)/.025))
     weight=(seam*(1-blend)+lateral*blend)*front*min(1,(y-(mouth_y-.062))/.035);dy=-.018*weight;dz=-.002*weight
    elif shape=='mouthPucker':
     weight=lateral*front*max(0,1-abs(y-mouth_y)/.026);dx=-x*.22*weight;dz=.009*weight
   values.append((dx,dy,dz))
  pp['targets'].append({'POSITION':accessor(b''.join(struct.pack('<3f',*v) for v in values),'VEC3',5126,len(values),[min(v[c] for v in values) for c in range(3)],[max(v[c] for v in values) for c in range(3)])})
 j['meshes'][2]['primitives'].append(pp)
j['meshes'][2]['weights']=[0,0];j['meshes'][2]['extras']={'targetNames':['jawOpen','mouthPucker']}
# Drop unused vertex color attributes (they darken the source skin in glTF renderers).
for m in j['meshes']:
 for p in m['primitives']:
  p['attributes']={k:v for k,v in p['attributes'].items() if not k.startswith('COLOR') and k not in ['TEXCOORD_1','TEXCOORD_2','TEXCOORD_3']}
for m in j['materials']:
 if m.get('name') in ['MI_Hair_1','MI_Hair_2']:m['pbrMetallicRoughness']['baseColorFactor']=[.12,.065,.032,1]
j['asset']['copyright']=f'Quaternius — Universal Base Characters [Standard], CC0 1.0. {title} adaptation: Chaya Studio.'
j['buffers']=[{'byteLength':len(data)}]
js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4);data+=b'\0'*((-len(data))%4)
out=pathlib.Path(f'public/studio/characters/{character}/{character}.glb');out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data)
(out.parent/'LICENSE.txt').write_text((root/'License_Standard.txt').read_text());print(out,len(out.read_bytes()))
