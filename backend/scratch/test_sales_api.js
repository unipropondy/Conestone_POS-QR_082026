const axios = require('axios');

(async () => {
  try {
    const res = await axios.get('http://localhost:5000/api/sales/all?startDate=2026-09-07&endDate=2026-09-07');
    console.log('API Sales count:', res.data.length);
    const targetBills = ['20260907-0007', '20260907-0006', '20260907-0005', '20260907-0004', '20260907-0003'];
    const filtered = res.data.filter(s => targetBills.includes(s.BillNo || s.OrderId));
    console.log(filtered.map(s => ({
      BillNo: s.BillNo || s.OrderId,
      PayMode: s.PayMode,
      SysAmount: s.SysAmount
    })));
  } catch (err) {
    console.error(err.message);
  }
})();
