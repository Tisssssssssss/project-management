"""Local demo server. SQLite snapshots, optimistic revisions, loopback only."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import sqlite3,json,threading,argparse,tempfile,subprocess
from urllib.parse import quote
BASE=Path(__file__).resolve().parent
LOCK=threading.Lock()
DB=BASE/'data'/'workspace.sqlite3'
DB.parent.mkdir(exist_ok=True)
with sqlite3.connect(DB) as c:
 c.execute('CREATE TABLE IF NOT EXISTS snapshots (revision INTEGER PRIMARY KEY, created TEXT DEFAULT CURRENT_TIMESTAMP, payload TEXT NOT NULL)')
def validate(d):
 if not isinstance(d,dict) or not isinstance(d.get('projects'),list) or not isinstance(d.get('tasks'),list):raise ValueError('项目或待办结构无效')
 ids=[]
 for p in d['projects']:
  if not isinstance(p,dict) or not all(isinstance(p.get(k),str) and p[k].strip() for k in ['id','name','unit']):raise ValueError('项目缺少有效编号、名称或单位')
  if not isinstance(p.get('events'),list):raise ValueError('项目进展结构无效')
  ids.append(p['id'])
 if len(ids)!=len(set(ids)):raise ValueError('项目编号重复')
 for r in d.get('ledger',[]):
  if r.get('pid') not in ids or not isinstance(r.get('cents'),int) or r['cents']<0:raise ValueError('金额或项目关联无效')
 for t in d['tasks']:
  if t.get('pid') and t.get('pid') not in ids:raise ValueError('待办项目不存在')
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(BASE/'dist'),**kw)
 def send_json(self,status,obj):
  raw=json.dumps(obj,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  if self.path=='/api/workspace':
   with LOCK,sqlite3.connect(DB) as c:row=c.execute('SELECT revision,payload FROM snapshots ORDER BY revision DESC LIMIT 1').fetchone()
   return self.send_json(200,{'revision':row[0] if row else 0,'data':json.loads(row[1]) if row else None})
  if self.path=='/api/health':return self.send_json(200,{'ok':True,'storage':'SQLite'})
  return super().do_GET()
 def do_POST(self):
  if self.path=='/api/export-xlsx':return self.export_xlsx()
  if self.path!='/api/workspace':return self.send_json(404,{'error':'接口不存在'})
  origin=self.headers.get('Origin')
  if origin and origin!=f'http://{self.headers.get("Host")}':return self.send_json(403,{'error':'来源不匹配'})
  try:
   size=int(self.headers.get('Content-Length','0'))
   if size>12*1024*1024:raise ValueError('备份超过12MB演示限制')
   req=json.loads(self.rfile.read(size));validate(req['data'])
   with LOCK,sqlite3.connect(DB) as c:
    rev=c.execute('SELECT COALESCE(MAX(revision),0) FROM snapshots').fetchone()[0]
    if req.get('revision')!=rev:return self.send_json(409,{'error':'另一窗口已更新数据，请刷新后再保存。当前输入可保留为草稿。'})
    c.execute('INSERT INTO snapshots(revision,payload) VALUES (?,?)',(rev+1,json.dumps(req['data'],ensure_ascii=False)))
   return self.send_json(200,{'revision':rev+1})
  except (ValueError,KeyError,TypeError,json.JSONDecodeError) as e:return self.send_json(400,{'error':str(e)})
  except Exception:return self.send_json(500,{'error':'数据库保存失败，请保留输入并重试'})
 def export_xlsx(self):
  origin=self.headers.get('Origin')
  if origin and origin!=f'http://{self.headers.get("Host")}':return self.send_json(403,{'error':'来源不匹配'})
  try:
   size=int(self.headers.get('Content-Length','0'))
   if not 0<size<=12*1024*1024:raise ValueError('导出请求大小无效')
   req=json.loads(self.rfile.read(size))
   if not isinstance(req.get('rows'),list) or len(req['rows'])>10000:raise ValueError('导出记录无效或超过10000条')
   node=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
   with tempfile.TemporaryDirectory(prefix='yuncheng-export-') as tmp:
    output=Path(tmp)/'projects.xlsx'
    result=subprocess.run([str(node),str(BASE/'export-xlsx.mjs')],input=json.dumps({'rows':req['rows'],'outputPath':str(output)},ensure_ascii=False),text=True,capture_output=True,timeout=90,cwd=str(BASE))
    if result.returncode or not output.exists():raise ValueError('Excel生成失败，请稍后重试')
    raw=output.read_bytes()
   name='项目台账_'+str(req.get('date','')).replace('/','-')[:10]+'.xlsx'
   self.send_response(200);self.send_header('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');self.send_header('Content-Disposition',"attachment; filename*=UTF-8''"+quote(name));self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
  except subprocess.TimeoutExpired:return self.send_json(503,{'error':'Excel生成耗时较长，请减少导出记录后重试'})
  except Exception as e:return self.send_json(400,{'error':str(e)})
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8766);args=p.parse_args()
 print(f'云程 V0.3: http://127.0.0.1:{args.port}',flush=True)
 ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
