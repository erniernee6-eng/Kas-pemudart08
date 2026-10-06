import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";

import {
  Wallet,
  LogOut,
  Plus,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Users,
  Receipt
} from "lucide-react";

import { auth, db } from "./firebase";

function rupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);
}

/* =========================
   LOGIN
========================= */

function Login() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (register) {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await updateProfile(result.user, {
          displayName: name
        });
      } else {
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="brand-icon">
          <Wallet size={32} />
        </div>

        <h1>Kas RT 08</h1>
        <p>Pembukuan Pemuda Pemudi RT 08</p>

        <form onSubmit={handleSubmit}>

          {register && (
            <input
              required
              placeholder="Nama lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            required
            minLength="6"
            type="password"
            placeholder="Password minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button className="primary">
            {register ? "Daftar" : "Masuk"}
          </button>

        </form>

        <button
          className="link-btn"
          onClick={() => setRegister(!register)}
        >
          {register
            ? "Sudah punya akun? Masuk"
            : "Belum punya akun? Daftar"}
        </button>

      </div>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard({ user }) {

  const [transactions, setTransactions] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [type, setType] = useState("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Iuran");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  /* Ambil transaksi realtime */

  useEffect(() => {

    const q = query(
      collection(db, "transactions"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      setTransactions(data);

    });

    return unsubscribe;

  }, []);

  /* Hitung saldo */

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );

  const expense = transactions
    .filter((item) => item.type === "expense")
    .reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );

  const balance = income - expense;

  /* Tambah transaksi */

  async function addTransaction(e) {

    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      alert("Nominal harus lebih dari 0");
      return;
    }

    await addDoc(
      collection(db, "transactions"),
      {
        type,
        amount: Number(amount),
        category,
        description,
        date,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      }
    );

    setAmount("");
    setDescription("");
    setCategory("Iuran");
    setShowForm(false);
  }

  /* Hapus transaksi */

  async function deleteTransaction(id) {

    const yes = confirm(
      "Yakin ingin menghapus transaksi ini?"
    );

    if (!yes) return;

    await deleteDoc(
      doc(db, "transactions", id)
    );
  }

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">

        <div>
          <h2>
            Kas Pemuda Pemudi RT 08
          </h2>

          <small>
            Halo, {user.displayName || user.email}
          </small>
        </div>

        <button
          className="logout"
          onClick={() => signOut(auth)}
        >
          <LogOut size={17} />
          Keluar
        </button>

      </header>

      <main>

        {/* STATISTIK */}

        <section className="cards">

          <div className="stat balance">
            <span>Saldo Kas</span>
            <b>{rupiah(balance)}</b>
            <Wallet />
          </div>

          <div className="stat income">
            <span>Total Pemasukan</span>
            <b>{rupiah(income)}</b>
            <ArrowUpCircle />
          </div>

          <div className="stat expense">
            <span>Total Pengeluaran</span>
            <b>{rupiah(expense)}</b>
            <ArrowDownCircle />
          </div>

          <div className="stat members">
            <span>Transaksi</span>
            <b>{transactions.length}</b>
            <Receipt />
          </div>

        </section>

        {/* JUDUL */}

        <section className="toolbar">

          <div>
            <h3>
              Transaksi Kas
            </h3>

            <p>
              Catatan pemasukan dan pengeluaran
            </p>
          </div>

          <button
            className="primary"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} />
            Tambah Transaksi
          </button>

        </section>

        {/* FORM */}

        {showForm && (

          <div className="modal-backdrop">

            <form
              className="modal"
              onSubmit={addTransaction}
            >

              <h3>
                Tambah Transaksi
              </h3>

              <label>
                Jenis

                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value)
                  }
                >

                  <option value="income">
                    Pemasukan
                  </option>

                  <option value="expense">
                    Pengeluaran
                  </option>

                </select>

              </label>

              <label>
                Nominal

                <input
                  required
                  type="number"
                  min="1"
                  placeholder="Contoh: 50000"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                />

              </label>

              <label>
                Kategori

                <input
                  required
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                />

              </label>

              <label>
                Keterangan

                <input
                  value={description}
                  placeholder="Contoh: Iuran Oktober"
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                />

              </label>

              <label>
                Tanggal

                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(e.target.value)
                  }
                />

              </label>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Batal
                </button>

                <button className="primary">
                  Simpan
                </button>

              </div>

            </form>

          </div>

        )}

        {/* TABEL */}

        <section className="table-wrap">

          <table>

            <thead>

              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Nominal</th>
                <th>Aksi</th>
              </tr>

            </thead>

            <tbody>

              {transactions.map((item) => (

                <tr key={item.id}>

                  <td>
                    {item.date}
                  </td>

                  <td>

                    <span
                      className={
                        item.type === "income"
                          ? "badge in"
                          : "badge out"
                      }
                    >

                      {item.type === "income"
                        ? "Pemasukan"
                        : "Pengeluaran"}

                    </span>

                  </td>

                  <td>
                    {item.category}
                  </td>

                  <td>
                    {item.description || "-"}
                  </td>

                  <td className="amount">
                    {rupiah(item.amount)}
                  </td>

                  <td>

                    <button
                      className="delete"
                      onClick={() =>
                        deleteTransaction(item.id)
                      }
                    >
                      <Trash2 size={16} />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {transactions.length === 0 && (
            <div className="empty">
              Belum ada transaksi.
            </div>
          )}

        </section>

      </main>

      <footer>
        Kas Pemuda Pemudi RT 08
      </footer>

    </div>
  );
}

/* =========================
   APP
========================= */

export default function App() {

  const [user, setUser] = useState(undefined);

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });

    return unsubscribe;

  }, []);

  if (user === undefined) {
    return (
      <div className="loading">
        Memuat aplikasi...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Dashboard user={user} />;
                  }
