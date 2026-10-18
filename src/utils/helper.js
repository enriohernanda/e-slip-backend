// Contoh fungsi helper format tanggal atau teks
const helper = {
  formatDate(date) {
    return new Date(date).toISOString();
  },
};

module.exports = helper;
