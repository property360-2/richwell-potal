import sqlite3
import pprint
conn = sqlite3.connect('backend/db.sqlite3')
res = conn.execute("SELECT id, subject_id, section_id, days, start_time, end_time FROM scheduling_schedule;").fetchall()
pprint.pprint(res)
