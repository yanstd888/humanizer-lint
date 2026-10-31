export const DEMO_SAMPLES = {
  'ai-id': {
    language: 'id',
    labelKey: 'sampleAiId',
    text: `Di era digital, perubahan teknologi menjadi bagian penting dalam kehidupan masyarakat. Selain itu, teknologi memberikan berbagai kemudahan bagi banyak orang dalam menjalankan aktivitas harian. Lebih lanjut, perkembangan ini juga mendorong perusahaan untuk melakukan transformasi secara menyeluruh. Namun demikian, setiap organisasi perlu mempertimbangkan berbagai tantangan yang dapat muncul selama proses tersebut.

Penting untuk diingat bahwa penerapan teknologi membutuhkan strategi yang matang dan terstruktur. Hal ini menunjukkan bahwa perusahaan harus melakukan pengimplementasian sistem secara hati-hati dan berkelanjutan. Tidak hanya meningkatkan efisiensi tetapi juga membantu organisasi menciptakan pengalaman yang lebih baik. Dalam konteks transformasi digital, teknologi adalah sebuah sistem yang mendukung perkembangan bisnis modern.

Secara keseluruhan, transformasi digital memiliki peran yang sangat penting bagi keberhasilan organisasi. Dapat disimpulkan bahwa perusahaan perlu terus beradaptasi agar mampu menghadapi perubahan yang semakin cepat. Selain itu, kolaborasi yang efektif diperlukan untuk memastikan seluruh proses dapat dijalankan dengan baik. Sebagai kesimpulan, pendekatan yang tepat akan membantu perusahaan mencapai hasil yang optimal dan berkelanjutan.
`,
  },
  'human-id': {
    language: 'id',
    labelKey: 'sampleHumanId',
    text: `Pagi itu server mati.

Rina sedang menyeduh kopi ketika tiga pesan masuk hampir bersamaan: kasir tidak bisa mencetak struk, gudang melihat stok minus, dan pemilik toko meminta laporan yang seharusnya sudah terkirim sejak subuh. Ia menaruh cangkirnya, membuka log, lalu menemukan satu tanggal kedaluwarsa yang luput diperbarui saat migrasi malam sebelumnya.

Masalahnya kecil. Dampaknya tidak.

Ia mengganti nilai tersebut dan menjalankan ulang antrean. Kasir kembali bekerja dalam dua menit, tetapi Rina belum menutup laptop karena stok minus masih perlu dilacak sampai sumbernya. Ternyata satu pemindai lama mengirim transaksi dua kali setiap kali koneksinya terputus sesaat.

Tidak ada rapat darurat.

Tim gudang mematikan pemindai itu, mencatat enam transaksi ganda, lalu memperbaiki jumlah barang berdasarkan nota fisik yang masih tersimpan di meja dekat rak paling belakang gudang. Menjelang makan siang, laporan terkirim dengan catatan singkat tentang koreksi yang dilakukan dan alasan angkanya berubah.

Besoknya mereka menambah pemeriksaan sederhana sebelum antrean diproses. Murah, agak membosankan, dan cukup untuk mencegah kejadian yang sama.
`,
  },
  'ai-en': {
    language: 'en',
    labelKey: 'sampleAiEn',
    text: `In today's fast-paced digital landscape, organizations must embrace robust technology to remain competitive. Moreover, modern platforms provide seamless experiences that elevate productivity across every department. Furthermore, these solutions foster collaboration and unlock new opportunities for sustainable growth. It is important to note that successful adoption requires a comprehensive and carefully structured strategy.

Technology is a system that enables organizations to improve their operational capabilities. This approach is crucial for leaders who want to navigate an ever-evolving business landscape. Not only does it enhance efficiency but also creates a pivotal foundation for future innovation. By using an integrated platform, teams can improve communication, ensuring the organization achieves its goals.

In conclusion, digital transformation represents a game-changer for modern organizations. It is worth noting that every company should develop a robust roadmap before beginning this journey. Moreover, leaders must foster a culture that can unlock the full potential of technology. The result is a seamless framework that can elevate performance and unleash long-term value.
`,
  },
  'human-en': {
    language: 'en',
    labelKey: 'sampleHumanEn',
    text: `The build broke at 4:17 p.m.

Maya had already packed her bag when the alert arrived, so she reopened the laptop and checked the last deployment. One configuration line pointed to a test bucket that had been deleted months earlier, but the failure appeared only now because a cached credential finally expired.

She changed the line. Nothing happened.

The worker had kept the old configuration in memory, which meant the clean-looking deploy had never restarted the process that actually handled customer uploads in production. Maya stopped the worker, watched it return with the correct bucket, and sent a small file through the public endpoint. It landed.

Before leaving, she added a startup check that rejects missing buckets and wrote down why a restart is required after configuration changes. The patch, test included, was twelve lines and saved the next person from reading forty minutes of misleading logs.

Her bag was still beside the door. Dinner was cold, but the queue was empty.
`,
  },
};
