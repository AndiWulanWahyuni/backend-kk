const express = require("express");
const router = express.Router();
const { db } = require("../config/firebaseConfig");
const { ethers } = require("ethers");
const KartuKeluarga = require("../models/KK");
require("dotenv").config();

const contractABI = require("../config/contractABI.json");
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

// 🔹 Store KK
router.post("/store", async (req, res) => {
  const { statusDokumen, nomorKK, alamat, anggotaKeluarga, daerah, penandatangan, tanggalTtd } = req.body;
  try {
    const existingDoc = await db.collection("KartuKeluarga").doc(nomorKK).get();
    if (existingDoc.exists) {
      return res.status(400).json({ success: false, message: "❌ Nomor KK sudah ada!" });
    }

    const kk = new KartuKeluarga(statusDokumen, nomorKK, alamat, anggotaKeluarga, daerah, penandatangan, tanggalTtd, "");
    const hashKK = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(kk)));
    kk.hashKK = hashKK;

    await db.collection("KartuKeluarga").doc(nomorKK).set({ ...kk });
    const tx = await contract.storeKK(nomorKK, hashKK);
    await tx.wait();

    res.json({ success: true, message: "✅ Data KK berhasil disimpan", hashKK });
  } catch (error) {
    res.status(500).json({ success: false, message: "❌ Error menyimpan", error: error.message });
  }
});

// 🔹 Verifikasi KK
router.post("/verify", async (req, res) => {
  const { nomorKK } = req.body;
  try {
    const doc = await db.collection("KartuKeluarga").doc(nomorKK).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Data tidak ditemukan" });

    const { hashKK } = doc.data();
    const isValid = await contract.verifyKK(nomorKK, hashKK);

    if (!isValid) return res.json({ success: false, message: "Verifikasi gagal, data diubah!" });

    res.json({ success: true, message: "✅ Data valid", data: doc.data() });
  } catch (error) {
    res.status(500).json({ success: false, message: "❌ Error saat verifikasi", error: error.message });
  }
});

// 🔹 Update KK
router.put("/update/:nomorKK", async (req, res) => {
  const nomorKK = req.params.nomorKK;
  const { statusDokumen, alamat, daerah, penandatangan, anggotaKeluarga } = req.body;
  try {
    const docRef = db.collection("KartuKeluarga").doc(nomorKK);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ success: false, message: "Data tidak ditemukan" });

    const kk = new KartuKeluarga(
      doc.data().statusDokumen,
      nomorKK,
      doc.data().alamat,
      doc.data().anggotaKeluarga,
      doc.data().daerah,
      doc.data().penandatangan,
      doc.data().tanggalTtd,
      doc.data().hashKK
    );

    kk.updateDataKK({ statusDokumen, alamat, daerah, penandatangan });
    kk.anggotaKeluarga = anggotaKeluarga;
    kk.tanggalTtd = new Date().toISOString();
    const dataForHash = {
      statusDokumen: kk.statusDokumen,
      nomorKK: kk.nomorKK,
      alamat: kk.alamat,
      anggotaKeluarga: kk.anggotaKeluarga,
      daerah: kk.daerah,
      penandatangan: kk.penandatangan,
      tanggalTtd: kk.tanggalTtd
    };
    const hashKK = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(dataForHash)));
    kk.hashKK = hashKK;

    await docRef.update(JSON.parse(JSON.stringify(kk)));
    const tx = await contract.storeKK(nomorKK, hashKK);
    await tx.wait();

    res.json({ success: true, message: "✅ Data KK berhasil diperbarui", hashKK });
  } catch (error) {
    res.status(500).json({ success: false, message: "❌ Gagal update data KK", error: error.message });
  }
});

// 🔹 Replace KK (edit nomor KK = buat data baru)
router.post("/replace", async (req, res) => {
  const {
    nomorKKLama,
    nomorKKBaru,
    statusDokumen,
    alamat,
    anggotaKeluarga,
    daerah,
    penandatangan
  } = req.body;

  try {
    // Validasi apakah nomorKKBaru sudah ada
    const cekBaru = await db.collection("KartuKeluarga").doc(nomorKKBaru).get();
    if (cekBaru.exists) {
      return res.status(400).json({ success: false, message: "❌ Nomor KK baru sudah ada!" });
    }

    // Buat data baru
    const tanggalTtd = new Date().toISOString();
    const kkBaru = new KartuKeluarga(
      statusDokumen,
      nomorKKBaru,
      alamat,
      anggotaKeluarga,
      daerah,
      penandatangan,
      tanggalTtd,
      ""
    );
    const hashBaru = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(kkBaru)));
    kkBaru.hashKK = hashBaru;

    await db.collection("KartuKeluarga").doc(nomorKKBaru).set({ ...kkBaru });
    await db.collection("KartuKeluarga").doc(nomorKKLama).update({ statusDokumen: "tidak aktif" });
    const tx = await contract.storeKK(nomorKKBaru, hashBaru);
    await tx.wait();

    res.json({ success: true, message: "✅ Data berhasil diganti dengan nomor KK baru", hashKK: hashBaru });
  } catch (error) {
    res.status(500).json({ success: false, message: "❌ Gagal ganti nomor KK", error: error.message });
  }
});

// 🔹 List Semua KK
router.get("/list", async (req, res) => {
  try {
    const snapshot = await db.collection("KartuKeluarga").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "❌ Gagal mengambil data", error: error.message });
  }
});

module.exports = router;
