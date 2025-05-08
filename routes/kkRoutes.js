const express = require("express");
const router = express.Router();
const { db } = require("../config/firebaseConfig");
const { ethers } = require("ethers");
require("dotenv").config();

// Load Smart Contract ABI
const contractABI = require("../config/contractABI.json");

// Konfigurasi Blockchain
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
// 🔍 Tes koneksi ke jaringan blockchain
provider.getNetwork()
  .then((net) => {
    console.log("✅ Tersambung ke network:", net.name, `(chainId: ${net.chainId})`);
  })
  .catch((err) => {
    console.error("❌ Gagal koneksi ke network:", err);
  });
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

// Debugging info
console.log("ethers version:", ethers.version);
console.log("RPC URL:", process.env.RPC_URL);
console.log("Contract Address:", process.env.CONTRACT_ADDRESS);
console.log("Wallet Address:", wallet.address);

// 🔹 1. Store KK
router.post("/store", async (req, res) => {
  const { statusDokumen, nomorKK, alamat, anggotaKeluarga, daerah, penandatangan, tanggalTtd } = req.body;

  try {
    // 🔍 Cek apakah data dengan nomorKK ini sudah ada di Firebase
    const existingDoc = await db.collection("KartuKeluarga").doc(nomorKK).get();
    if (existingDoc.exists) {
        return res.status(400).json({
            success: false,
            message: "❌ Nomor KK sudah ada! Silahkan Buat Baru.",
        });
    }

    // Gabungkan & hash data
    const dataKK = JSON.stringify({ statusDokumen, nomorKK, alamat, anggotaKeluarga, daerah, penandatangan, tanggalTtd });
    const hashKK = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataKK));

    // Simpan ke Firebase
    await db.collection("KartuKeluarga").doc(nomorKK).set({
      statusDokumen,
      nomorKK,
      alamat,
      anggotaKeluarga,
      daerah,
      penandatangan,
      tanggalTtd,
      hashKK,
    });
    console.log("Data berhasil disimpan ke Firebase");

    // Simpan hash ke Blockchain
    console.log("Mengirim ke blockchain...");
    const tx = await contract.storeKK(nomorKK, hashKK);
    await tx.wait();
    console.log("Transaksi berhasil:", tx.hash);

    res.json({ success: true, message: "Data KK berhasil disimpan", hashKK });
  } catch (error) {
    console.error("❌ Error saat menyimpan:", error);
    res.status(500).json({ success: false, message: "Error menyimpan data", error: error.message });
  }
});

// 🔹 2. Verifikasi KK
router.post("/verify", async (req, res) => {
  const { nomorKK } = req.body;

  try {
    const doc = await db.collection("KartuKeluarga").doc(nomorKK).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
    }

    const { hashKK } = doc.data();
    const isValid = await contract.verifyKK(nomorKK, hashKK);

    if (!isValid) {
      return res.json({ success: false, message: "Verifikasi gagal, data diubah!" });
    }

    res.json({ success: true, message: "Data valid", data: doc.data() });
  } catch (error) {
    console.error("❌ Error saat verifikasi:", error);
    res.status(500).json({ success: false, message: "Error saat verifikasi", error: error.message });
  }
});

// 🔹 3. Update Data KK
router.put("/update/:nomorKK", async (req, res) => {
  const nomorKK = req.params.nomorKK;
  const { statusDokumen, alamat, daerah, penandatangan, anggotaKeluarga } = req.body;

  try {
    const docRef = db.collection("KartuKeluarga").doc(nomorKK);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
    }

    // Tanggal TTD otomatis diperbarui
    const tanggalTtd = new Date().toISOString();

    const updatedData = {
      statusDokumen,
      alamat,
      daerah,
      penandatangan,
      anggotaKeluarga,
      tanggalTtd,
    };

    // Hash ulang data
    const dataKKBaru = JSON.stringify({
      statusDokumen,
      nomorKK,
      alamat,
      anggotaKeluarga,
      daerah,
      penandatangan,
      tanggalTtd,
    });
    const hashKK = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataKKBaru));

    updatedData.hashKK = hashKK;

    // Simpan ke Firebase
    await docRef.update(updatedData);
    console.log("✅ Data KK diperbarui di Firebase");

    // Simpan hash ke Blockchain
    const tx = await contract.storeKK(nomorKK, hashKK);
    await tx.wait();
    console.log("✅ Transaksi Blockchain sukses:", tx.hash);

    res.json({ success: true, message: "Data KK berhasil diperbarui", hashKK });
  } catch (error) {
    console.error("❌ Error update:", error);
    res.status(500).json({ success: false, message: "Gagal update data KK", error: error.message });
  }
});

// 🔹 4. List semua data KK
router.get("/list", async (req, res) => {
  try {
    const snapshot = await db.collection("KartuKeluarga").get();

    const data = snapshot.docs.map((doc) => {
      const kk = doc.data();
      return {
        nomorKK: kk.nomorKK,
        alamat: kk.alamat,
        statusDokumen: kk.statusDokumen,
        daerah: kk.daerah,
        penandatangan: kk.penandatangan,
        tanggalTtd: kk.tanggalTtd,
        anggotaKeluarga: kk.anggotaKeluarga,
        hashKK: kk.hashKK,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("❌ Gagal mengambil data KK:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data", error: error.message });
  }
});

module.exports = router;
