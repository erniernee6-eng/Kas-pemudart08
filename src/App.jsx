import { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword, onAuthStateChanged,
  signInWithEmailAndPassword, signOut, updateProfile
} from "firebase/auth";
import { jsPDF } from "jspdf";
import {
  Wallet, LayoutDashboard, Receipt, Users, BarChart3, LogOut,
  Plus, Trash2, Pencil, Download, Printer, Search, Menu, X,
  ArrowUpCircle, ArrowDownCircle, UserPlus, CalendarDays
} from "lucide-react";
import { auth, db } from "./firebase";

const IDR = n => new Intl.NumberFormat("id-ID", {
  style:"currency", currency:"IDR", maximumFractionDigits:0
}).format(Number(n)||0);

const today = () => new Date().toISOString().slice(0,10);
const monthNow = () => new Date().toISOString().slice(0,7);

function Login() {
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");

  async function submit(e){
    e.preventDefault(); setError("");
    try{
      if(mode==="register"){
        const c=await createUserWithEmailAndPassword(auth,email,password);
        await updateProfile(c.user,{displayName:name});
        await setDoc(doc(db,"users",c.user.uid),{
          name,email,role:"member",createdAt:serverTimestamp()
        });
      }else{
        await signInWithEmailAndPassword(auth,email,password);
      }
    }catch(err){ setError(err.message.replace("Firebase: ","")); }
  }

  return <div className="login">
    <div className="login-box">
      <div className="logo"><Wallet/></div>
      <h1>Kas RT 08</h1>
      <p>Pembukuan Pemuda Pemudi RT 08</p>
      <form onSubmit={submit}>
        {mode==="register" && <input required placeholder="Nama lengkap" value={name} onChange={e=>setName(e.target.value)}/>}
        <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input required minLength="6" type="password" placeholder="Password minimal 6 karakter" value={password} onChange={e=>setPassword(e.target.value)}/>
        {error && <div className="alert error">{error}</div>}
        <button className="btn primary">{mode==="login"?"Masuk":"Buat Akun"}</button>
      </form>
      <button className="text-btn" onClick={()=>setMode(mode==="login"?"register":"login")}>
        {mode==="login"?"Belum punya akun? Daftar":"Sudah punya akun? Masuk"}
      </button>
    </div>
  </div>
}

function Modal({title,onClose,children}) {
  return <div className="backdrop"><div className="modal">
    <div className="modal-head"><h3>{title}</h3><button className="icon" onClick={onClose}><X/></button></div>
    {children}
  </div></div>
}

function Dashboard({user,role}) {
  const [tab,setTab]=useState("dashboard");
  const [mobile,setMobile]=useState(false);
  const [transactions,setTransactions]=useState([]);
  const [members,setMembers]=useState([]);
  const [dues,setDues]=useState([]);
  const [settings,setSettings]=useState({name:"Pemuda Pemudi RT 08",address:""});
  const [search,setSearch]=useState("");
  const [period,setPeriod]=useState(monthNow());
  const [modal,setModal]=useState(null);

  useEffect(()=>onSnapshot(query(collection(db,"transactions"),orderBy("date","desc")),s=>setTransactions(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
  useEffect(()=>onSnapshot(collection(db,"members"),s=>setMembers(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
  useEffect(()=>onSnapshot(collection(db,"dues"),s=>setDues(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
  useEffect(()=>onSnapshot(doc(db,"settings","app"),s=>s.exists()&&setSettings(s.data())),[]);

  const income=transactions.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0);
  const expense=transactions.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0);
  const balance=income-expense;
  const periodTx=transactions.filter(x=>(x.date||"").startsWith(period));
  const periodIn=periodTx.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0);
  const periodOut=periodTx.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0);
  const filteredTx=transactions.filter(x=>{
    const q=search.toLowerCase();
    return !q || [x.category,x.description,x.date,x.amount].join(" ").toLowerCase().includes(q);
  });

  function nav(t){setTab(t);setMobile(false)}

  async function saveTransaction(data){
    await addDoc(collection(db,"transactions"),{
      ...data, amount:Number(data.amount), createdBy:user.uid,createdAt:serverTimestamp()
    });
    setModal(null);
  }
  async function saveMember(data){
    if(data.id){const {id,...rest}=data;await updateDoc(doc(db,"members",id),rest);}
    else await addDoc(collection(db,"members"),{...data,createdAt:serverTimestamp()});
    setModal(null);
  }
  async function remove(col,id){
    if(confirm("Hapus data ini?")) await deleteDoc(doc(db,col,id));
  }
  async function saveDues(data){
    const key=`${data.memberId}_${data.month}`;
    await setDoc(doc(db,"dues",key),{
      memberId:data.memberId,month:data.month,amount:Number(data.amount),
      status:"paid",paidAt:serverTimestamp(),paidBy:user.uid
    });
    setModal(null);
  }
  async function saveSettings(e){
    e.preventDefault();
    await setDoc(doc(db,"settings","app"),settings,{merge:true});
    setModal(null);
  }

  function exportCSV(){
    const rows=[["Tanggal","Jenis","Kategori","Keterangan","Nominal"],...transactions.map(x=>[
      x.date,x.type==="income"?"Pemasukan":"Pengeluaran",x.category,x.description||"",x.amount
    ])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));
    a.download=`kas-rt08-${today()}.csv`;a.click();
  }

  function exportPDF(){
    const pdf=new jsPDF();
    pdf.setFontSize(16);pdf.text(settings.name||"Kas Pemuda Pemudi RT 08",14,18);
    pdf.setFontSize(10);pdf.text(`Laporan transaksi - ${today()}`,14,26);
    pdf.text(`Saldo: ${IDR(balance)}`,14,34);
    let y=44;
    pdf.setFontSize(9);
    filteredTx.slice(0,28).forEach((x,i)=>{
      const line=`${x.date} | ${x.type==="income"?"+":"-"} ${IDR(x.amount)} | ${x.category} | ${(x.description||"").slice(0,45)}`;
      pdf.text(line,14,y);y+=7;
    });
    pdf.save(`laporan-kas-rt08-${today()}.pdf`);
  }

  const navs=[
    ["dashboard","Dashboard",LayoutDashboard],
    ["transactions","Transaksi",Receipt],
    ["members","Anggota",Users],
    ["dues","Iuran Bulanan",CalendarDays],
    ["reports","Laporan",BarChart3]
  ];

  return <div className="shell">
    <aside className={mobile?"open":""}>
      <div className="side-brand"><span className="brand-mini"><Wallet size={20}/></span><div><b>Kas RT 08</b><small>Pemuda Pemudi</small></div></div>
      <nav>{navs.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>nav(id)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-bottom">
        {role==="admin" && <button onClick={()=>setModal({type:"settings"})}><Pencil size={17}/>Pengaturan</button>}
        <button onClick={()=>signOut(auth)}><LogOut size={17}/>Keluar</button>
      </div>
    </aside>

    <section className="content">
      <header className="topbar">
        <button className="icon mobile-menu" onClick={()=>setMobile(!mobile)}>{mobile?<X/>:<Menu/>}</button>
        <div><h2>{settings.name||"Kas Pemuda Pemudi RT 08"}</h2><span>Selamat datang, {user.displayName||user.email}</span></div>
        <div className="role">{role}</div>
      </header>

      <main>
        {tab==="dashboard" && <DashboardPage balance={balance} income={income} expense={expense} members={members.length} dues={dues} periodIn={periodIn} periodOut={periodOut} period={period} setPeriod={setPeriod}/>}
        {tab==="transactions" && <TransactionsPage data={filteredTx} search={search} setSearch={setSearch} onAdd={()=>setModal({type:"transaction"})} onDelete={id=>remove("transactions",id)} onCSV={exportCSV} onPDF={exportPDF}/>}
        {tab==="members" && <MembersPage data={members} onAdd={()=>setModal({type:"member"})} onEdit={m=>setModal({type:"member",data:m})} onDelete={id=>remove("members",id)}/>}
        {tab==="dues" && <DuesPage members={members} dues={dues} period={period} setPeriod={setPeriod} onPay={m=>setModal({type:"dues",data:{memberId:m.id,month:period,amount:5000}})}/>}
        {tab==="reports" && <ReportsPage transactions={transactions} period={period} setPeriod={setPeriod} onPDF={exportPDF}/>}
      </main>

      {modal?.type==="transaction" && <TransactionModal onClose={()=>setModal(null)} onSave={saveTransaction}/>}
      {modal?.type==="member" && <MemberModal data={modal.data} onClose={()=>setModal(null)} onSave={saveMember}/>}
      {modal?.type==="dues" && <DuesModal data={modal.data} members={members} onClose={()=>setModal(null)} onSave={saveDues}/>}
      {modal?.type==="settings" && <Modal title="Pengaturan" onClose={()=>setModal(null)}><form onSubmit={saveSettings} className="form">
        <label>Nama organisasi<input value={settings.name||""} onChange={e=>setSettings({...settings,name:e.target.value})}/></label>
        <label>Alamat<input value={settings.address||""} onChange={e=>setSettings({...settings,address:e.target.value})}/></label>
        <button className="btn primary">Simpan</button>
      </form></Modal>}
    </section>
  </div>
}

function DashboardPage(p){
  const totalDues=p.members;
  return <div>
    <div className="page-title"><div><h1>Dashboard</h1><p>Ringkasan keuangan kas RT 08.</p></div><input className="month" type="month" value={p.period} onChange={e=>p.setPeriod(e.target.value)}/></div>
    <div className="stats">
      <Stat title="Saldo Kas" value={IDR(p.balance)} icon={Wallet} cls="blue"/>
      <Stat title="Total Pemasukan" value={IDR(p.income)} icon={ArrowUpCircle} cls="green"/>
      <Stat title="Total Pengeluaran" value={IDR(p.expense)} icon={ArrowDownCircle} cls="red"/>
      <Stat title="Jumlah Anggota" value={p.members} icon={Users} cls="yellow"/>
    </div>
    <div className="grid2">
      <div className="panel"><div className="panel-head"><h3>Ringkasan Bulan Ini</h3><span>{p.period}</span></div>
        <div className="summary"><div><span>Pemasukan</span><b className="green-text">{IDR(p.periodIn)}</b></div><div><span>Pengeluaran</span><b className="red-text">{IDR(p.periodOut)}</b></div><div><span>Selisih</span><b>{IDR(p.periodIn-p.periodOut)}</b></div></div>
      </div>
      <div className="panel"><div className="panel-head"><h3>Status Iuran</h3></div>
        <div className="progress"><span>Anggota terdaftar</span><b>{totalDues}</b></div>
        <p className="muted">Gunakan menu Iuran Bulanan untuk mencatat pembayaran anggota.</p>
      </div>
    </div>
  </div>
}
function Stat({title,value,icon:Icon,cls}){return <div className={`stat ${cls}`}><span>{title}</span><b>{value}</b><Icon/></div>}

function TransactionsPage({data,search,setSearch,onAdd,onDelete,onCSV,onPDF}){
  return <div>
    <div className="page-title"><div><h1>Transaksi Kas</h1><p>Semua pemasukan dan pengeluaran.</p></div><button className="btn primary" onClick={onAdd}><Plus size={17}/>Tambah Transaksi</button></div>
    <div className="actions"><div className="search"><Search size={17}/><input placeholder="Cari transaksi..." value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="btn light" onClick={onCSV}><Download size={16}/>CSV</button><button className="btn light" onClick={onPDF}><Download size={16}/>PDF</button><button className="btn light" onClick={()=>window.print()}><Printer size={16}/>Cetak</button></div>
    <div className="panel table-scroll"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>
      {data.map(x=><tr key={x.id}><td>{x.date}</td><td><span className={`badge ${x.type}`}>{x.type==="income"?"Pemasukan":"Pengeluaran"}</span></td><td>{x.category}</td><td>{x.description||"-"}</td><td className="money">{IDR(x.amount)}</td><td><button className="icon danger" onClick={()=>onDelete(x.id)}><Trash2 size={16}/></button></td></tr>)}
    </tbody></table>{!data.length&&<div className="empty">Belum ada transaksi.</div>}</div>
  </div>
}

function MembersPage({data,onAdd,onEdit,onDelete}){
  return <div>
    <div className="page-title"><div><h1>Data Anggota</h1><p>Kelola anggota pemuda-pemudi RT 08.</p></div><button className="btn primary" onClick={onAdd}><UserPlus size={17}/>Tambah Anggota</button></div>
    <div className="panel table-scroll"><table><thead><tr><th>Nama</th><th>No. HP</th><th>Status</th><th>Alamat</th><th>Aksi</th></tr></thead><tbody>
      {data.map(m=><tr key={m.id}><td><b>{m.name}</b></td><td>{m.phone||"-"}</td><td><span className="badge active">{m.status||"aktif"}</span></td><td>{m.address||"-"}</td><td><button className="icon" onClick={()=>onEdit(m)}><Pencil size={16}/></button><button className="icon danger" onClick={()=>onDelete(m.id)}><Trash2 size={16}/></button></td></tr>)}
    </tbody></table>{!data.length&&<div className="empty">Belum ada anggota.</div>}</div>
  </div>
}

function DuesPage({members,dues,period,setPeriod,onPay}){
  const paid=new Set(dues.filter(x=>x.month===period&&x.status==="paid").map(x=>x.memberId));
  return <div>
    <div className="page-title"><div><h1>Iuran Bulanan</h1><p>Catat pembayaran iuran anggota.</p></div><input className="month" type="month" value={period} onChange={e=>setPeriod(e.target.value)}/></div>
    <div className="panel table-scroll"><table><thead><tr><th>Nama Anggota</th><th>Periode</th><th>Status</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>
      {members.map(m=>{const ok=paid.has(m.id);return <tr key={m.id}><td>{m.name}</td><td>{period}</td><td><span className={`badge ${ok?"paid":"unpaid"}`}>{ok?"Lunas":"Belum bayar"}</span></td><td>{IDR(5000)}</td><td>{!ok&&<button className="btn small primary" onClick={()=>onPay(m)}>Bayar</button>}</td></tr>})}
    </tbody></table>{!members.length&&<div className="empty">Tambahkan anggota terlebih dahulu.</div>}</div>
  </div>
}

function ReportsPage({transactions,period,setPeriod,onPDF}){
  const rows=transactions.filter(x=>(x.date||"").startsWith(period));
  const inTotal=rows.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0);
  const outTotal=rows.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0);
  const cats={};rows.forEach(x=>{cats[x.category]=(cats[x.category]||0)+Number(x.amount||0)});
  return <div>
    <div className="page-title"><div><h1>Laporan</h1><p>Rekap transaksi berdasarkan bulan.</p></div><div className="row"><input className="month" type="month" value={period} onChange={e=>setPeriod(e.target.value)}/><button className="btn light" onClick={onPDF}><Download size={16}/>PDF</button></div></div>
    <div className="stats"><Stat title="Pemasukan" value={IDR(inTotal)} icon={ArrowUpCircle} cls="green"/><Stat title="Pengeluaran" value={IDR(outTotal)} icon={ArrowDownCircle} cls="red"/><Stat title="Selisih" value={IDR(inTotal-outTotal)} icon={Wallet} cls="blue"/></div>
    <div className="panel"><div className="panel-head"><h3>Rekap Kategori</h3><span>{rows.length} transaksi</span></div>
      <div className="category-list">{Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=><div className="category" key={k}><span>{k}</span><b>{IDR(v)}</b></div>)}{!Object.keys(cats).length&&<div className="empty">Belum ada data pada periode ini.</div>}</div>
    </div>
  </div>
}

function TransactionModal({onClose,onSave}){
  const [d,setD]=useState({type:"income",amount:"",category:"Iuran",description:"",date:today()});
  return <Modal title="Tambah Transaksi" onClose={onClose}><form className="form" onSubmit={e=>{e.preventDefault();onSave(d)}}>
    <label>Jenis<select value={d.type} onChange={e=>setD({...d,type:e.target.value})}><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select></label>
    <label>Nominal<input required type="number" min="1" value={d.amount} onChange={e=>setD({...d,amount:e.target.value})}/></label>
    <label>Kategori<input required value={d.category} onChange={e=>setD({...d,category:e.target.value})}/></label>
    <label>Keterangan<input value={d.description} onChange={e=>setD({...d,description:e.target.value})}/></label>
    <label>Tanggal<input required type="date" value={d.date} onChange={e=>setD({...d,date:e.target.value})}/></label>
    <button className="btn primary">Simpan</button>
  </form></Modal>
}
function MemberModal({data,onClose,onSave}){
  const [d,setD]=useState(data||{name:"",phone:"",status:"aktif",address:""});
  return <Modal title={data?"Edit Anggota":"Tambah Anggota"} onClose={onClose}><form className="form" onSubmit={e=>{e.preventDefault();onSave(d)}}>
    <label>Nama<input required value={d.name} onChange={e=>setD({...d,name:e.target.value})}/></label>
    <label>No. HP<input value={d.phone} onChange={e=>setD({...d,phone:e.target.value})}/></label>
    <label>Status<select value={d.status} onChange={e=>setD({...d,status:e.target.value})}><option>aktif</option><option>nonaktif</option></select></label>
    <label>Alamat<input value={d.address} onChange={e=>setD({...d,address:e.target.value})}/></label>
    <button className="btn primary">Simpan</button>
  </form></Modal>
}
function DuesModal({data,members,onClose,onSave}){
  const [d,setD]=useState(data);
  return <Modal title="Catat Pembayaran Iuran" onClose={onClose}><form className="form" onSubmit={e=>{e.preventDefault();onSave(d)}}>
    <label>Anggota<select value={d.memberId} onChange={e=>setD({...d,memberId:e.target.value})}>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    <label>Periode<input type="month" value={d.month} onChange={e=>setD({...d,month:e.target.value})}/></label>
    <label>Nominal<input type="number" min="1" value={d.amount} onChange={e=>setD({...d,amount:e.target.value})}/></label>
    <button className="btn primary">Simpan Pembayaran</button>
  </form></Modal>
}

export default function App(){
  const [user,setUser]=useState(undefined);
  const [role,setRole]=useState("member");
  useEffect(()=>onAuthStateChanged(auth,async u=>{
    setUser(u);
    if(u){
      const unsub=onSnapshot(doc(db,"users",u.uid),s=>setRole(s.data()?.role||"member"));
      return unsub;
    }
  }),[]);
  if(user===undefined)return <div className="loading">Memuat aplikasi...</div>;
  return user?<Dashboard user={user} role={role}/>:<Login/>;
}
