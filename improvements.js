/* Bông iu: calendar, teaching and finance improvements. All data stays in the
   same user payload so existing browser records remain readable. */
nav.splice(2,0,['todos','☑️','To-do']);
nav.splice(nav.length-1,0,['teaching','📚','Lịch dạy']);
titles.todos='To-do';
titles.teaching='Lịch dạy';
schema.teaching=[
  ['student','Học sinh','select',['Long','Quyên','Trúc']],
  ['date','Ngày dạy','date'],
  ['time','Giờ dạy','time'],
  ['status','Trạng thái','select',['Đã lên lịch','Đã dạy','Đã hủy','Hoãn']],
  ['note','Ghi chú','textarea']
];
schema.items.splice(3,0,['priority','Ưu tiên','select',['Vừa','Cao','Thấp']]);
schema.bills.splice(3,0,['category','Danh mục','select',categories]);
schema.transactions.splice(4,0,['wallet','Ví / tài khoản','select',['Tiền mặt','Ngân hàng']]);

function normalizeData(){
  data.teaching ||= [];
  data.students ||= {Long:{rate:0,aliases:[]},Quyên:{rate:0,aliases:[]},Trúc:{rate:0,aliases:[]}};
  data.teachingPayments ||= [];
  for(const lesson of data.teaching){
    if(!lesson.status)lesson.status='Đã dạy'; // dữ liệu cũ đã được tính là buổi dạy
    if(lesson.rate===undefined)lesson.rate=0;
  }
  data.settings ||= {};
  data.settings.monthlyBudgets ||= {};
  data.settings.categories ||= {Thu:['Lương','Lương dạy','Thưởng','Khác'],Chi:[...categories]};
  data.settings.wallets ||= ['Tiền mặt','Ngân hàng'];
  data.settings.salaryAmount ||= 0;
  data.budgets ||= [];
  data.items ||= [];
  data.transactions ||= [];
  data.bills ||= [];
}
normalizeData();
const originalRender=render, originalAction=action, originalOpenModal=openModal;
const originalRenderCard=renderCard, originalDashboard=dashboard;
const originalCalendar=calendar, originalReports=reports;
const originalBudgets=budgets, originalGeneric=generic;
let txMonth=month(),txType='Tất cả',todoFilter='Chưa xong',budgetMonth=month(),lastRemoved=null;
const dateVN=d=>d?new Date(d+'T12:00:00').toLocaleDateString('vi-VN'):'Không hạn';
const teachingStudents=['Long','Quyên','Trúc'];
const paidForLesson=x=>{
  const allocations=(data.teachingPayments||[]).flatMap(p=>p.voided?[]:(p.allocations||[])).filter(a=>a.lessonId===x.id);
  return x.paid&&!allocations.length?(Number(x.rate)||0):allocations.reduce((n,a)=>n+a.amount,0);
};
const remainingForLesson=x=>Math.max(0,(Number(x.rate)||0)-paidForLesson(x));
const unpaidLessons=s=>data.teaching.filter(x=>x.student===s&&x.status==='Đã dạy'&&remainingForLesson(x)>0);
const countLessons=s=>data.teaching.filter(x=>x.student===s&&x.status==='Đã dạy').length;
const budgetFor=m=>Number(data.settings.monthlyBudgets[m]??(m===month()?data.settings.monthlyBudget:0))||0;
const billSpent=(m=month())=>sum(data.transactions.filter(x=>x.type==='Chi'&&x.billId&&x.date?.slice(0,7)===m));
const flexibleSpent=(m=month())=>sum(data.transactions.filter(x=>x.type==='Chi'&&!x.billId&&x.date?.slice(0,7)===m));
const budgetLeft2=(m=month())=>budgetFor(m)-flexibleSpent(m);
function remainingDaily(){
  const end=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  return Math.max(0,budgetLeft2()/Math.max(1,end-new Date().getDate()+1));
}

render=function(){
  normalizeData();
  if(page==='teaching') shell(teachingPage());
  else if(page==='todos') shell(todosPage());
  else if(page==='transactions') shell(transactionsPage());
  else if(page==='bills') shell(billsPage());
  else originalRender();
  if(!$('#app .layout'))return;
  const top=$('.top-actions');
  if(top){top.insertAdjacentHTML('afterbegin',`<button class="btn small" data-action="export" title="Tải bản sao dữ liệu">↓ Sao lưu</button><button class="btn small" data-action="import" title="Khôi phục từ bản sao">↑ Khôi phục</button>`)}
  if(!$('#backupFile'))document.body.insertAdjacentHTML('beforeend','<input id="backupFile" type="file" accept="application/json,.json" hidden>');
};

dashboard=function(){
  let html=originalDashboard();
  const actualToday=tasksFor(today()).filter(x=>x.kind!=='Lịch dạy');
  html=html.replace(/(<div class="muted">Việc hôm nay<\/div><strong>)[^<]+/,`$1${actualToday.filter(x=>!done(x,today())).length}`);
  html=html.replace(/(<section class="card"><div class="section-head"><h2>Việc của hôm nay<\/h2><button class="btn small" data-page="calendar">Xem tất cả<\/button><\/div>)[\s\S]*?(<\/section>)/,(_,start,end)=>start+(actualToday.length?actualToday.slice(0,5).map(x=>itemRow(x,today())).join(''):empty('Hôm nay chưa có việc nào 🌿'))+end);
  const b=budgetFor(month());
  if(b<=0){
    html=html.replace(/<strong>0 ₫<\/strong><div class="muted">còn \d+ ngày<\/div>/,'<strong>Chưa đặt</strong><div class="muted">ngân sách tháng</div>');
    html=html.replace(/<strong style="font:800 27px Nunito">[^<]+<\/strong>/,'<strong style="font:800 27px Nunito">Chưa đặt hạn mức</strong>');
    html=html.replace(/<span class="tag" style="background:#fff0ef;color:#a33">Đã vượt ngân sách<\/span>/,'');
  }else{
    const remaining=money(remainingDaily());
    html=html.replace(/(<div class="muted">Có thể chi mỗi ngày<\/div><strong>)[^<]+/,`$1${remaining}`);
    html=html.replace(/(<div class="muted">Còn lại<\/div><strong style="font:800 27px Nunito">)[^<]+/,`$1${money(budgetLeft2())}`);
  }
  const due=data.bills.filter(x=>x.paidMonth!==month()&&Number(x.dueDay)>=new Date().getDate()&&Number(x.dueDay)<=new Date().getDate()+3);
  if(due.length)html+=`<section class="card" style="margin-top:18px"><h2>Chi phí sắp đến hạn</h2>${due.map(x=>`<div class="row"><span class="grow">${esc(x.title)} · ngày ${x.dueDay}</span><strong>${money(x.amount)}</strong></div>`).join('')}</section>`;
  return html;
};

function todosPage(){
  const todayTasks=tasksFor(today()).filter(x=>x.kind!=='Lịch dạy');
  const all=data.items.filter(x=>x.kind!=='Lịch dạy');
  const filtered=all.filter(x=>{
    const completed=(x.doneDates||[]).length>0;
    if(todoFilter==='Đã xong')return completed;
    if(todoFilter==='Quá hạn')return x.date&&x.date<today()&&!completed;
    return !completed;
  }).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  return pageHead('Xem việc chưa xong, đã xong và quá hạn ở một nơi.')+
    `<div class="mini-grid"><div class="mini">Chưa xong<strong>${all.filter(x=>!(x.doneDates||[]).length).length}</strong></div><div class="mini">Quá hạn<strong>${all.filter(x=>x.date&&x.date<today()&&!(x.doneDates||[]).length).length}</strong></div><div class="mini">Hôm nay<strong>${todayTasks.length}</strong></div></div>`+
    `<div class="toolbar" style="margin-top:18px">${['Chưa xong','Đã xong','Quá hạn'].map(x=>`<button class="btn small ${todoFilter===x?'primary':''}" data-todo-filter="${x}">${x}</button>`).join('')}</div>`+
    `<section class="card">${filtered.length?filtered.map(x=>todoRow(x)).join(''):empty('Không có việc trong mục này 🌸')}</section>`;
}
function todoRow(x){
  const d=x.date||today(),completed=(x.doneDates||[]).length>0;
  return `<div class="row"><input class="check" type="checkbox" data-check="${x.id}" data-date="${d}" aria-label="Hoàn thành ${esc(x.title)}" ${completed?'checked':''}><div class="grow"><strong>${esc(x.title)}</strong><small>${dateVN(x.date)} · ${esc(x.priority||'Vừa')}${x.date&&x.date<today()&&!completed?' · Quá hạn':''}</small></div><div class="inline-actions"><button class="btn small" data-edit="items:${x.id}">Sửa</button><button class="btn small" data-move="${x.id}">Dời ngày</button><button class="btn small danger" data-delete="items:${x.id}">Xóa</button></div></div>`;
}
calendar=function(){
  let html=originalCalendar();
  html=html.replace(/<div class="dots">●*/g,(m,offset)=>m);
  const d=new Date(selectedDate+'T12:00:00'),y=d.getFullYear(),m=d.getMonth();
  for(let day=1;day<=new Date(y,m+1,0).getDate();day++){
    const dt=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const n=tasksFor(dt).length;
    if(n)html=html.replace(new RegExp(`(data-date="${dt}"[^>]*><b>${day}<\\/b><div class="dots">)[^<]*(<\\/div>)`),`$1${n} mục$2`);
  }
  html=html.replace(/<button class="btn small" data-edit="items:([^" ]+)" aria-label="Sửa ([^"]+)">Sửa<\/button>/g,(_,rid,title)=>`<button class="btn small" data-edit="items:${rid}" aria-label="Sửa ${title}">Sửa</button><button class="btn small danger" data-delete="items:${rid}">Xóa</button>`);
  return html;
};

function teachingPage(){
  const cards=teachingStudents.map(s=>{
    const unpaid=unpaidLessons(s);
    const last=data.teaching.filter(x=>x.student===s&&x.status==='Đã dạy').sort((a,b)=>b.date.localeCompare(a.date))[0];
    const due=unpaid.reduce((n,x)=>n+remainingForLesson(x),0);
    const rate=Number(data.students[s]?.rate)||0;
    return `<div class="card"><span class="eyebrow">HỌC SINH</span><h2>${s}</h2><div class="mini-grid"><div class="mini">Buổi chưa thanh toán<strong>${unpaid.length}</strong></div><div class="mini">Tiền còn phải thu<strong>${money(due)}</strong></div><div class="mini">Đã dạy tất cả<strong>${countLessons(s)}</strong></div></div><p class="muted">Dạy gần nhất: ${dateVN(last?.date)}. Chỉ buổi đã đánh dấu “Đã dạy” mới tính lương.</p><label class="field">Đơn giá mỗi buổi (₫)<input id="rate-${s}" type="number" min="0" value="${rate}"></label><button class="btn small" data-action="saverate:${s}" style="margin:8px 0 12px">Lưu đơn giá</button><div class="form-grid"><label class="field">Số tiền thực nhận (₫)<input id="salary-${s}" type="number" min="1" max="${due}" placeholder="Nhập tiền lương"></label><label class="field">Ngày nhận<input id="salary-date-${s}" type="date" value="${today()}"></label><label class="field">Nhận vào<select id="salary-wallet-${s}">${data.settings.wallets.map(w=>`<option>${esc(w)}</option>`).join('')}</select></label></div><button class="btn primary" data-action="salary:${s}" style="margin-top:12px" ${due<=0?'disabled':''}>Nhận lương ${s}</button></div>`;
  }).join('');
  const lessons=[...data.teaching].sort((a,b)=>b.date.localeCompare(a.date));
  const payments=[...data.teachingPayments].reverse();
  return pageHead('Ngày dạy linh hoạt: tự thêm buổi và hệ thống đếm riêng cho Long, Quyên, Trúc.')+
    `<section class="card"><h2>Thêm nhanh buổi dạy</h2><div class="toolbar"><input id="quickLesson" placeholder="Ví dụ: Dạy Long" aria-label="Tên buổi dạy"><input id="quickDate" type="date" value="${today()}" aria-label="Ngày dạy"><input id="quickTime" type="time" aria-label="Giờ dạy"><button class="btn primary" data-action="quicklesson">Thêm lịch</button></div><p class="muted">Buổi mới ở trạng thái “Đã lên lịch”. Sau khi dạy xong, bấm “Đã dạy” để tính lương.</p></section>`+
    `<div class="grid" style="margin-top:18px">${cards}</div><section class="card" style="margin-top:18px"><h2>Buổi dạy</h2>${lessons.length?lessons.map(x=>`<div class="row"><span class="grow"><strong>Dạy ${esc(x.student)}</strong><small>${dateVN(x.date)} ${esc(x.time||'')} · ${esc(x.status)}${x.status==='Đã dạy'?` · ${money(x.rate)} · Còn ${money(remainingForLesson(x))}`:''}</small></span>${x.status!=='Đã dạy'?`<button class="btn small" data-action="taught:${x.id}">Đã dạy</button>`:''}<button class="btn small" data-lesson-edit="${x.id}">Sửa</button><button class="btn small danger" data-lesson-delete="${x.id}">Xóa</button></div>`).join(''):empty('Chưa có buổi dạy nào 📚')}</section><section class="card" style="margin-top:18px"><h2>Lịch sử nhận lương</h2>${payments.length?payments.map(p=>`<div class="row"><span class="grow"><strong>${esc(p.student)} · ${money(p.amount)}</strong><small>${dateVN(p.date)} · ${p.voided?'Đã hủy':'Đã nhận'}</small></span>${!p.voided?`<button class="btn small danger" data-action="voidsalary:${p.id}">Hủy phiếu</button>`:''}</div>`).join(''):empty('Chưa có lần nhận lương nào')}</section>`;
}

function transactionsPage(){
  const monthly=monthTx(txMonth),shown=monthly.filter(x=>txType==='Tất cả'||x.type===txType);
  const dates=[...new Set(shown.map(x=>x.date||'Không rõ ngày'))].sort().reverse();
  return pageHead('Theo dõi thu nhập, tiền lương và các khoản chi theo tháng.')+
    `<div class="mini-grid"><div class="mini">Tổng thu<strong>${money(income(txMonth))}</strong></div><div class="mini">Tổng chi<strong>${money(spent(txMonth))}</strong></div><div class="mini">Chênh lệch<strong>${money(income(txMonth)-spent(txMonth))}</strong></div></div>`+
    `<div class="toolbar" style="margin-top:18px"><label class="field">Tháng<input data-tx-month type="month" value="${txMonth}"></label><label class="field">Loại<select data-tx-type>${['Tất cả','Thu','Chi'].map(x=>`<option ${txType===x?'selected':''}>${x}</option>`).join('')}</select></label><button class="btn soft" data-action="addcategory">＋ Danh mục</button></div>`+
    `<div class="grid">${dates.length?dates.map(d=>`<section class="card"><h2>${dateVN(d)}</h2>${shown.filter(x=>(x.date||'Không rõ ngày')===d).map(x=>`<div class="row"><div class="grow"><strong>${esc(x.title)}</strong><small>${esc(x.category||'Khác')} · ${esc(x.wallet||'Chưa chọn ví')}${x.billId?' · Từ chi phí cố định':''}</small></div><strong style="color:${x.type==='Thu'?'#32866d':'#bc5a7c'}">${x.type==='Thu'?'+':'−'}${money(x.amount)}</strong><button class="btn small" data-edit="transactions:${x.id}">Sửa</button><button class="btn small danger" data-delete="transactions:${x.id}">Xóa</button></div>`).join('')}</section>`).join(''):empty('Chưa có giao dịch trong tháng này 🌷')}</div>`;
}

function billsPage(){
  const total=sum(data.bills.filter(x=>x.cycle!=='Hằng năm'));
  return pageHead('Các khoản định kỳ sẽ hiện trạng thái theo ngày đến hạn của tháng hiện tại.')+
    `<div class="mini-grid"><div class="mini">Chi cố định hàng tháng<strong>${money(total)}</strong></div><div class="mini">Chưa thanh toán<strong>${data.bills.filter(x=>x.paidMonth!==month()).length} khoản</strong></div><div class="mini">Đã thanh toán<strong>${data.bills.filter(x=>x.paidMonth===month()).length} khoản</strong></div></div>`+
    `<div class="grid" style="margin-top:18px">${data.bills.length?data.bills.map(x=>renderCard(x,'bills')).join(''):empty('Chưa có chi phí cố định 🧾')}</div>`;
}

renderCard=function(x,key){
  if(key==='budgets'){
    const used=sum(monthTx(budgetMonth).filter(t=>t.type==='Chi'&&!t.billId&&t.category===x.category));
    const limit=Number(x.amount)||0,ratio=limit>0?used/limit:0;
    return `<article class="card"><div class="row"><div class="grow"><h3>${esc(x.category)}</h3><small>Đã chi ${money(used)} / ${money(limit)}</small><div class="progress"><i style="width:${Math.min(100,ratio*100)}%;background:${ratio>=1?'#d96b70':ratio>=.8?'#efa76b':'#8fcdb8'}"></i></div>${limit>0&&ratio>=.8?`<small class="danger">${ratio>=1?'Đã đạt hoặc vượt hạn mức':'Đã dùng từ 80% hạn mức'}</small>`:''}</div></div><div class="inline-actions"><button class="btn small" data-edit="budgets:${x.id}">Sửa</button><button class="btn small danger" data-delete="budgets:${x.id}">Xóa</button></div></article>`;
  }
  if(key!=='bills')return originalRenderCard(x,key);
  const day=Number(x.dueDay)||1,now=new Date().getDate(),paid=x.paidMonth===month();
  const status=paid?'Đã thanh toán':day<now?'Quá hạn':day<=now+3?'Sắp đến hạn':'Chưa thanh toán';
  const color=status==='Quá hạn'?'#a6384b':status==='Sắp đến hạn'?'#936016':'#417765';
  return `<article class="card"><div class="row"><div class="grow"><h3>${esc(x.title)}</h3><small>Ngày ${day} · ${esc(x.cycle||'Hằng tháng')} · ${esc(x.category||'Khác')}</small></div><div class="right"><strong>${money(x.amount)}</strong><p style="color:${color};margin:6px 0">${status}</p></div></div><div class="inline-actions">${paid?`<button class="btn small" data-action="unpaybill:${x.id}">Hủy đã trả</button>`:`<button class="btn small" data-action="paybill:${x.id}">Đã trả</button>`}<button class="btn small" data-edit="bills:${x.id}">Sửa</button><button class="btn small danger" data-delete="bills:${x.id}">Xóa</button></div></article>`;
};

budgets=function(){
  const b=budgetFor(budgetMonth),used=flexibleSpent(budgetMonth),ratio=b>0?used/b:0;
  const prev=new Date(budgetMonth+'-01T12:00:00');prev.setMonth(prev.getMonth()-1);
  const previous=prev.toLocaleDateString('en-CA').slice(0,7);
  const fixed=sum(data.bills.filter(x=>x.cycle!=='Hằng năm'));
  return pageHead('Đặt ngân sách theo tháng; chi phí cố định được theo dõi riêng.',false)+
    `<div class="toolbar"><label class="field">Chọn tháng<input type="month" data-budget-month value="${budgetMonth}"></label><button class="btn soft" data-action="copybudget">Sao chép tháng trước</button></div>`+
    `<div class="grid two"><section class="card"><h2>Ngân sách ${budgetMonth}</h2><label class="field">Hạn mức chi tiêu<input id="monthlyBudget2" type="number" min="0" value="${b}"></label><button class="btn primary" data-action="savebudget2" style="margin-top:12px">Lưu hạn mức</button><p>${b>0?`Đã chi ${money(used)} · Còn ${money(b-used)}`:`Chưa đặt hạn mức · Đã ghi ${money(used)} chi tiêu`}</p>${b>0?`<div class="progress"><i style="width:${Math.min(100,ratio*100)}%;background:${ratio>=1?'#d96b70':ratio>=.8?'#efa76b':'#8fcdb8'}"></i></div>${ratio>=.8?`<p class="danger">${ratio>=1?'Đã đạt hoặc vượt hạn mức':'Đã dùng từ 80% ngân sách'}</p>`:''}`:''}</section>`+
    `<section class="card"><h2>Phân bổ thu nhập</h2><label class="field">Lương / thu nhập dự kiến<input id="salaryAmount" type="number" min="0" value="${data.settings.salaryAmount||''}"></label><p class="muted">Chi phí cố định đã khai báo: ${money(fixed)}</p><div class="mini-grid">${['Bắt buộc','Tiết kiệm','Chi tiêu'].map((t,i)=>`<div class="mini"><label class="field">${t} %<input class="split" data-index="${i}" type="number" min="0" max="100" value="${data.settings.salarySplit[i]}"></label><strong>${money((data.settings.salaryAmount||0)*data.settings.salarySplit[i]/100)}</strong></div>`).join('')}</div><button class="btn soft" data-action="savesalary" style="margin-top:12px">Lưu phân bổ</button></section></div>`+
    `<div class="section-head" style="margin-top:24px"><h2>Hạn mức theo danh mục</h2><button class="btn primary" data-action="add">＋ Thêm danh mục</button></div><div class="grid">${data.budgets.filter(x=>!x.month||x.month===budgetMonth).length?data.budgets.filter(x=>!x.month||x.month===budgetMonth).map(x=>renderCard(x,'budgets')).join(''):empty()}</div>`;
};

reports=function(){
  let html=originalReports();
  const m=filter||month(),b=budgetFor(m),out=spent(m);
  html=html.replace(/(<div class="mini">Ngân sách còn<strong>)[^<]+/,`$1${b?money(b-flexibleSpent(m)):'Chưa đặt'}`);
  html=html.replace(/Còn [^<]+ ngân sách chưa dùng/,`Còn ${b?money(Math.max(0,b-flexibleSpent(m))):'chưa xác định'} ngân sách chưa dùng`);
  return html;
};

openModal=function(key=page,record=null){
  if(key==='calendar'||key==='todos')key='items';
  if(key==='transactions'){
    normalizeData();
    const type=record?.type||'Chi';
    schema.transactions.find(f=>f[0]==='category')[3]=data.settings.categories[type];
    schema.transactions.find(f=>f[0]==='wallet')[3]=data.settings.wallets;
  }
  if(key==='budgets'){
    if(!schema.budgets.some(f=>f[0]==='month'))schema.budgets.push(['month','Tháng','month']);
    record ||= {month:budgetMonth};
  }
  originalOpenModal(key,record);
};

function addLesson(student,date,time='',note='',status='Đã lên lịch'){
  const lesson={id:id(),student,date,time,note,status,rate:status==='Đã dạy'?Number(data.students[student]?.rate)||0:0};
  data.teaching.push(lesson);
  data.items.push({id:id(),title:`Dạy ${student}`,date,time,kind:'Lịch dạy',note,teachingId:lesson.id,doneDates:[]});
  save();toast(`Đã thêm lịch dạy ${student}.`);
}
function toast(message,undo=false){
  $('#appToast')?.remove();
  document.body.insertAdjacentHTML('beforeend',`<div id="appToast" role="status" style="position:fixed;bottom:75px;right:18px;z-index:20;background:#303047;color:white;padding:12px 16px;border-radius:12px;box-shadow:var(--shadow)">${esc(message)} ${undo?'<button class="btn small" data-action="undo">Hoàn tác</button>':''}</div>`);
  setTimeout(()=>$('#appToast')?.remove(),5500);
}
action=function(a){
  const [name,value]=a.split(':');
  normalizeData();
  if(name==='quicklesson'){
    const raw=$('#quickLesson')?.value.trim()||'';
    const student=teachingStudents.find(s=>raw.toLocaleLowerCase('vi-VN').includes(s.toLocaleLowerCase('vi-VN')));
    if(!student)return alert('Hãy ghi “Dạy Long”, “Dạy Quyên” hoặc “Dạy Trúc”.');
    const date=$('#quickDate')?.value||today();
    addLesson(student,date,$('#quickTime')?.value||'');return;
  }
  if(name==='salary'){
    const lessons=unpaidLessons(value).sort((a,b)=>a.date.localeCompare(b.date));
    if(!lessons.length)return;
    const amount=Number(document.getElementById(`salary-${value}`)?.value);
    if(!Number.isFinite(amount)||amount<=0)return alert('Vui lòng nhập số tiền lớn hơn 0.');
    const due=lessons.reduce((n,x)=>n+remainingForLesson(x),0);
    if(amount>due)return alert(`Số tiền vượt khoản còn phải thu ${money(due)}.`);
    const paymentId=id();
    let left=amount;
    const allocations=[];
    for(const lesson of lessons){
      const paid=Math.min(left,remainingForLesson(lesson));
      if(paid>0)allocations.push({lessonId:lesson.id,amount:paid});
      left-=paid;if(left<=0)break;
    }
    const receivedDate=document.getElementById(`salary-date-${value}`)?.value||today();
    const wallet=document.getElementById(`salary-wallet-${value}`)?.value||'Tiền mặt';
    data.teachingPayments.push({id:paymentId,student:value,date:receivedDate,wallet,amount,allocations,voided:false});
    data.transactions.push({id:paymentId,title:`Lương dạy ${value}`,type:'Thu',amount,category:'Lương dạy',wallet,date:receivedDate,student:value,paymentId});
    save();toast(`Đã ghi nhận ${money(amount)}; còn phải thu ${money(due-amount)}.`);return;
  }
  if(name==='saverate'){
    const rate=Number(document.getElementById(`rate-${value}`)?.value);
    if(!Number.isInteger(rate)||rate<0)return alert('Đơn giá phải là số nguyên không âm.');
    data.students[value].rate=rate;
    // Bản cũ chưa lưu đơn giá từng buổi: chỉ bổ sung cho các buổi đó.
    data.teaching.filter(x=>x.student===value&&x.status==='Đã dạy'&&x.rate===0&&!x.paid).forEach(x=>x.rate=rate);
    save();toast(`Đã lưu đơn giá của ${value}.`);return;
  }
  if(name==='taught'){
    const lesson=data.teaching.find(x=>x.id===value);if(!lesson)return;
    if(lesson.status==='Đã dạy')return;
    const rate=Number(data.students[lesson.student]?.rate)||0;
    if(rate<=0)return alert(`Hãy nhập đơn giá cho ${lesson.student} trước khi xác nhận đã dạy.`);
    lesson.status='Đã dạy';lesson.rate=rate;
    save();toast('Đã xác nhận buổi dạy.');return;
  }
  if(name==='voidsalary'){
    const payment=data.teachingPayments.find(x=>x.id===value);if(!payment||payment.voided)return;
    if(!confirm(`Hủy phiếu nhận lương ${money(payment.amount)}? Giao dịch Thu liên quan cũng sẽ được xóa.`))return;
    payment.voided=true;
    data.transactions=data.transactions.filter(x=>x.id!==payment.id);
    save();toast('Đã hủy phiếu lương và đảo khoản Thu.');return;
  }
  if(name==='paybill'){
    const x=data.bills.find(v=>v.id===value);if(!x)return;
    x.paidMonth=month();
    data.transactions.push({id:id(),title:x.title,type:'Chi',amount:x.amount,category:x.category||'Khác',wallet:'Ngân hàng',date:today(),billId:x.id});
    save();toast('Đã ghi khoản chi cố định.');return;
  }
  if(name==='unpaybill'){
    const x=data.bills.find(v=>v.id===value);if(!x)return;
    data.transactions=data.transactions.filter(t=>!(t.billId===x.id&&t.date?.slice(0,7)===month()));
    x.paidMonth='';save();toast('Đã hủy thanh toán và khoản chi tương ứng.');return;
  }
  if(name==='savebudget2'){
    const n=Number($('#monthlyBudget2')?.value);
    if(!Number.isFinite(n)||n<0)return alert('Hạn mức không hợp lệ.');
    data.settings.monthlyBudgets[budgetMonth]=n;
    if(budgetMonth===month())data.settings.monthlyBudget=n;
    save();toast('Đã lưu ngân sách.');return;
  }
  if(name==='copybudget'){
    const d=new Date(budgetMonth+'-01T12:00:00');d.setMonth(d.getMonth()-1);
    const prev=d.toLocaleDateString('en-CA').slice(0,7);
    if(!budgetFor(prev))return alert('Tháng trước chưa có ngân sách để sao chép.');
    data.settings.monthlyBudgets[budgetMonth]=budgetFor(prev);
    data.budgets=data.budgets.filter(x=>x.month!==budgetMonth);
    data.budgets.push(...data.budgets.filter(x=>x.month===prev).map(x=>({...x,id:id(),month:budgetMonth})));
    save();toast('Đã sao chép ngân sách tháng trước.');return;
  }
  if(name==='savesalary'){
    const salary=Number($('#salaryAmount')?.value),parts=[...document.querySelectorAll('.split')].map(x=>Number(x.value));
    if(!Number.isFinite(salary)||salary<0)return alert('Số lương không hợp lệ.');
    if(parts.reduce((n,x)=>n+x,0)!==100)return alert('Tổng tỷ lệ cần bằng 100%.');
    data.settings.salaryAmount=salary;data.settings.salarySplit=parts;
    save();toast('Đã lưu phân bổ.');return;
  }
  if(name==='addcategory'){
    const type=prompt('Danh mục cho Thu hay Chi?',txType==='Thu'?'Thu':'Chi');
    if(type!=='Thu'&&type!=='Chi')return;
    const title=prompt('Tên danh mục mới:')?.trim();if(!title)return;
    if(!data.settings.categories[type].includes(title))data.settings.categories[type].push(title);
    save();toast('Đã thêm danh mục '+title);return;
  }
  if(name==='export'){
    const blob=new Blob([JSON.stringify({format:'bong-iu-backup',version:2,exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`bong-iu-sao-luu-${today()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  if(name==='import'){$('#backupFile').click();return}
  if(name==='undo'&&lastRemoved){data[lastRemoved.key].splice(lastRemoved.index,0,lastRemoved.item);lastRemoved=null;save();toast('Đã hoàn tác.');return}
  originalAction(a);
};

document.addEventListener('click',e=>{
  const f=e.target.closest('[data-todo-filter]');if(f){todoFilter=f.dataset.todoFilter;render();return}
  const le=e.target.closest('[data-lesson-edit]');if(le){const x=data.teaching.find(x=>x.id===le.dataset.lessonEdit);if(x)openModal('teaching',x);return}
  const m=e.target.closest('[data-move]');if(m){const x=data.items.find(x=>x.id===m.dataset.move);if(!x)return;const d=prompt('Ngày mới (YYYY-MM-DD):',x.date||today());if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){x.date=d;save();toast('Đã dời việc.')}return}
  const l=e.target.closest('[data-lesson-delete]');if(l){
    const rid=l.dataset.lessonDelete,lesson=data.teaching.find(x=>x.id===rid);
    if(!lesson)return;
    if(lesson.paid||paidForLesson(lesson)>0)return alert('Buổi này đã liên quan đến lương. Hãy hủy phiếu nhận lương trước khi xóa.');
    if(!confirm('Xóa buổi dạy này?'))return;
    data.teaching=data.teaching.filter(x=>x.id!==rid);data.items=data.items.filter(x=>x.teachingId!==rid);save();toast('Đã xóa buổi dạy.');return
  }
},true);

document.addEventListener('click',e=>{
  const d=e.target.closest('[data-delete]');if(!d)return;
  e.stopImmediatePropagation();
  const [key,rid]=d.dataset.delete.split(':');
  const index=data[key]?.findIndex(x=>x.id===rid);
  if(index<0||!confirm('Xóa mục này?'))return;
  lastRemoved={key,index,item:data[key][index]};
  data[key].splice(index,1);
  save();toast('Đã xóa mục.',true);
},true);

document.addEventListener('change',e=>{
  if(e.target.matches('[data-tx-month]')){txMonth=e.target.value;render()}
  if(e.target.matches('[data-tx-type]')){txType=e.target.value;render()}
  if(e.target.matches('[data-budget-month]')){budgetMonth=e.target.value;render()}
  if(e.target.matches('#entryForm select[name="type"]')){
    const select=$('#entryForm select[name="category"]');
    if(select)select.innerHTML=data.settings.categories[e.target.value].map(x=>`<option>${esc(x)}</option>`).join('');
  }
  if(e.target.id==='backupFile'&&e.target.files[0]){
    const reader=new FileReader();
    reader.onload=()=>{try{
      const obj=JSON.parse(reader.result);
      if(obj.format!=='bong-iu-backup'||!obj.data||!Array.isArray(obj.data.transactions))throw Error('File không đúng định dạng sao lưu Bông iu.');
      const counts=`${obj.data.transactions.length} giao dịch, ${(obj.data.items||[]).length} mục lịch, ${(obj.data.teaching||[]).length} buổi dạy`;
      if(!confirm(`Bản sao lưu chứa ${counts}. Khôi phục sẽ thay toàn bộ dữ liệu hiện tại. Bạn muốn tiếp tục?`))return;
      data=obj.data;normalizeData();save();toast('Đã khôi phục dữ liệu.');
    }catch(err){alert(err.message)}finally{e.target.value=''}};
    reader.readAsText(e.target.files[0]);
  }
});

document.addEventListener('submit',e=>{
  if(e.target.id!=='entryForm'||e.target.dataset.key!=='teaching')return;
  e.preventDefault();e.stopImmediatePropagation();
  const f=e.target,v=Object.fromEntries(new FormData(f));
  if(!v.date)return alert('Hãy chọn ngày dạy.');
  if(f.dataset.id){
    const x=data.teaching.find(x=>x.id===f.dataset.id);if(!x)return;
    if(x.student!==v.student&&(x.paid||paidForLesson(x)>0))return alert('Buổi đã liên quan đến lương. Hãy hủy phiếu trước khi đổi học sinh.');
    if(x.status==='Đã dạy'&&v.status!=='Đã dạy'&&paidForLesson(x)>0)return alert('Buổi đã nhận lương. Hãy hủy phiếu lương trước khi đổi trạng thái.');
    if(v.status==='Đã dạy'&&x.status!=='Đã dạy'){
      const rate=Number(data.students[v.student]?.rate)||0;
      if(rate<=0)return alert(`Hãy đặt đơn giá cho ${v.student} trước khi xác nhận đã dạy.`);
      x.rate=rate;
    }
    Object.assign(x,v);
    const cal=data.items.find(i=>i.teachingId===x.id);
    if(cal)Object.assign(cal,{title:`Dạy ${v.student}`,date:v.date,time:v.time,note:v.note});
    save();toast('Đã sửa buổi dạy.');
  }else{
    if(v.status==='Đã dạy'&&!(Number(data.students[v.student]?.rate)>0))return alert(`Hãy đặt đơn giá cho ${v.student} trước khi xác nhận đã dạy.`);
    addLesson(v.student,v.date,v.time,v.note,v.status);
  }
  $('#modal')?.remove();
},true);

render();
