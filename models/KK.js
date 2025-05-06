class KartuKeluarga {
    constructor(statusDokumen, nomorKK, alamat, anggotaKeluarga, daerah, penandatangan, tanggalTtd, hashKK) {
        this.statusDokumen = statusDokumen; // "aktif" atau "tidak aktif"
        this.nomorKK = nomorKK;
        this.alamat = alamat;
        this.anggotaKeluarga = anggotaKeluarga; // Array [{nama: "John", hubungan: "Anak"}]
        this.daerah = daerah; // Contoh: "Pemerintah Kota Palu"
        this.penandatangan = penandatangan; // Nama penandatangan
        this.tanggalTtd = tanggalTtd;
        this.hashKK = hashKK;
    }
}

module.exports = KartuKeluarga;
