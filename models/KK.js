class KartuKeluarga {
    constructor(nomorKK, alamat, anggotaKeluarga, hashKK) {
        this.nomorKK = nomorKK;
        this.alamat = alamat;
        this.anggotaKeluarga = anggotaKeluarga; // Array [{nama: "John", hubungan: "Anak"}]
        this.hashKK = hashKK;
    }
}

module.exports = KartuKeluarga;
