"""Seed synthetic data only. Never reads the production workspace."""
import sys,sqlite3,json,datetime
from pathlib import Path
folder=Path(sys.argv[1]); folder.mkdir(parents=True,exist_ok=True)
db=folder/'workspace.sqlite3'
with sqlite3.connect(db) as c:
 c.execute('CREATE TABLE IF NOT EXISTS snapshots (revision INTEGER PRIMARY KEY, created TEXT DEFAULT CURRENT_TIMESTAMP, payload TEXT NOT NULL)')
 if c.execute('SELECT COUNT(*) FROM snapshots').fetchone()[0]:sys.exit(0)
 today=datetime.date.today();date=today.isoformat();earlier=(today-datetime.timedelta(days=10)).isoformat()
 projects=[];ledger=[]
 for i,(name,unit,stage,amount,kind,basis) in enumerate([('园区云平台建设','演示园区','方案交流',18000000,'quote','total'),('智能客服试点','演示企业','报价商务',12000000,'budget','annual'),('办公系统迁移','演示机构','已签约',8000000,'contract','total')]):
  pid='demo-project-'+str(i)
  projects.append(dict(id=pid,name=name,unit=unit,stage=stage,bu=['企业','金融','教育'][i],type='云服务',owner='演示负责人',background='此项目为虚构演示数据，用于审核桌面应用体验。',createdDate=earlier,events=[dict(id='demo-event-'+str(i),date=date,time='09:30',type=stage,title='演示进展记录',body='已完成本轮方案讨论，准备下一步工作。',recordedAt=date+'T09:30:00+08:00')],stageHistory=[dict(id='demo-stage-'+str(i),date=earlier,stage=stage,recordedAt=earlier+'T09:00:00+08:00',source='演示初始化')],archiveHistory=[],files=[dict(name='演示方案说明.pdf',size=245760)],competitors=[],quotes=[],starred=False))
  ledger.append(dict(id='demo-money-'+str(i),pid=pid,kind=kind,title='演示金额 V1',cents=amount,basis=basis,date=date,time='09:30',confirmed=True,source='虚构演示',recordedAt=date+'T09:30:00+08:00'))
 tasks=[dict(id='demo-task',pid=projects[0]['id'],title='完善演示方案',date=date,state='action',done=False,owner='演示负责人',createdDate=date)]
 data=dict(schemaVersion=3,modelVersion=3,projects=projects,ledger=ledger,tasks=tasks,finance=[],audit=[])
 c.execute('INSERT INTO snapshots(revision,payload) VALUES(?,?)',(1,json.dumps(data,ensure_ascii=False)))
