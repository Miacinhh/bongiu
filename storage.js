/* IndexedDB is the source of truth. Existing localStorage data is migrated once. */
const localDb = new Dexie('bong-iu-local');
localDb.version(1).stores({state:'key'});
let storageReady=false;
let pendingWrite=Promise.resolve();
const previousSaveLocal=saveLocal;
saveLocal=function(){
  if(!storageReady){previousSaveLocal();return}
  const snapshot=structuredClone(data);
  pendingWrite=pendingWrite.then(()=>localDb.state.put({key:'main',payload:snapshot,updatedAt:Date.now()})).catch(error=>{
    console.error('Không thể lưu dữ liệu Bông iu',error);
    toast('Không thể lưu dữ liệu. Hãy xuất bản sao lưu ngay.');
  });
};
(async()=>{
  try{
    const record=await localDb.state.get('main');
    if(record?.payload){
      data={...initial(),...record.payload};
    }else{
      const legacy=localStorage.getItem('bong-iu-demo');
      if(legacy){
        data={...initial(),...JSON.parse(legacy)};
        await localDb.state.put({key:'main',payload:structuredClone(data),updatedAt:Date.now()});
      }
    }
    storageReady=true;
    localStorage.removeItem('bong-iu-demo');
    normalizeData();render();
  }catch(error){
    console.error('Không thể mở IndexedDB',error);
    toast('Không thể mở kho dữ liệu. Trang đang dùng bản lưu tạm của trình duyệt.');
  }
})();
