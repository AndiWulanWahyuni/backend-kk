class KartuKeluarga {
    constructor(statusDokumen, nomorKK, alamat, anggotaKeluarga, daerah, penandatangan, tanggalTtd, hashKK) {
      this.statusDokumen = statusDokumen; // "aktif" atau "tidak aktif"
      this.nomorKK = nomorKK;
      this.alamat = alamat;
      this.anggotaKeluarga = anggotaKeluarga || []; // array of objects
      this.daerah = daerah;
      this.penandatangan = penandatangan;
      this.tanggalTtd = tanggalTtd;
      this.hashKK = hashKK;
    }
  
    // Fungsi update data umum
    updateDataKK({ statusDokumen, nomorKK, alamat, daerah, penandatangan }) {
      if (statusDokumen) this.statusDokumen = statusDokumen;
      if (nomorKK) this.nomorKK = nomorKK;
      if (alamat) this.alamat = alamat;
      if (daerah) this.daerah = daerah;
      if (penandatangan) this.penandatangan = penandatangan;
  
      // Set waktu tanda tangan baru setiap kali update
      this.tanggalTtd = new Date().toISOString();
    }
  
    // Fungsi menambah anggota
    tambahAnggota(nama, hubungan) {
      this.anggotaKeluarga.push({ nama, hubungan });
    }
  
    // Fungsi hapus anggota berdasarkan index
    hapusAnggotaByIndex(index) {
      if (index >= 0 && index < this.anggotaKeluarga.length) {
        this.anggotaKeluarga.splice(index, 1);
      }
    }
}

module.exports = KartuKeluarga;
  