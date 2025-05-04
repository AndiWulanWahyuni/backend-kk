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
  const { nomorKK, alamat, anggotaKeluarga } = req.body;

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
    const dataKK = JSON.stringify({ nomorKK, alamat, anggotaKeluarga });
    const hashKK = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataKK));

    // Simpan ke Firebase
    await db.collection("KartuKeluarga").doc(nomorKK).set({
      nomorKK,
      alamat,
      anggotaKeluarga,
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

module.exports = router;
