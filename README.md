# Kociş & Karıcık Puan Programı

Ev içi sadakat programı. Rica edilen her iş puan kazandırır, biriken puanlar ödüle dönüşür — tıpkı
market kartları gibi, ama iki kişilik.

İki para birimi var ve **veren kişi adını verir**: Kociş bir şey rica edince eşi *Kociş Puanı* kazanır,
eşi rica edince Kociş *Karıcık Puanı* kazanır. Yani cüzdanınızda hep karşı tarafın para birimi birikir;
kendi para biriminizi ise sınırsız basabilirsiniz.

## Nasıl çalışıyor

Sunucu yok, hesap yok, aylık ücret yok. Puanlar her telefonun kendi tarayıcısında durur; transfer,
imzalı QR kuponların elden ele geçmesiyle olur.

- **Puan verme** tek taramadır. Kupon kesersiniz, eşiniz okutur, puanı hesabına geçer.
- **Ödül harcama** iki taramadır. Talep QR'ı kesilir (puan yerelde ayrılır ama düşmez), karşı taraf
  okutup onaylar ve bir onay QR'ı verir; o taranınca puan gerçekten düşer.
- Her QR'ın metin karşılığı da vardır. Kamera çalışmasa da, aynı odada olmasanız da kupon
  WhatsApp'tan geçebilir.

## Güvenlik

GitHub Pages ücretsiz katmanı repoyu public olmaya zorluyor, yani paketi herkes indirebilir. Bu yüzden
**pakette hiçbir sır yoktur**:

- Kurulumda cihazda rastgele bir tuz üretilir ve PIN'den `PBKDF2(600k, SHA-256)` ile 256 bitlik bir
  anahtar türetilir. Tuz, anahtar ve doğrulama değeri yalnızca telefonlarda durur.
- İkinci telefon, bir kerelik **eşleştirme QR'ı** ile tuzu ve doğrulama değerini alır — içinde PIN veya
  anahtar yoktur. Aynı PIN girilince aynı anahtar türetilir.
- Her kupon bu anahtarla HMAC-SHA256 ile imzalanır. İmzası tutmayan kupon kabul edilmez, aynı kupon iki
  kez kullanılamaz, 14 günden eski kupon geçersizdir.
- Siteyi bulan bir yabancı boş bir kurulum ekranından başka bir şey görmez; kırabileceği bir materyal
  indiremez.

## Veri kaybına dikkat

Puanlar yalnızca telefonun tarayıcı depolamasında durur. iOS Safari, ana ekrana eklenmemiş sitelerin
verisini 7 gün kullanılmazsa silebilir. Bu yüzden:

1. Uygulamayı **ana ekrana ekleyin** (iPhone: Paylaş → "Ana Ekrana Ekle" · Android: menü → "Uygulamayı yükle").
2. Ayarlar'dan ara sıra **yedek alın**; yedek dosyasını bulut sürücünüzde saklayın.

## Geliştirme

```bash
npm install
npm run dev
```

| Komut | İş |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Kupon imzalama, tekrar kullanım, bakiye ve yedek testleri |
| `npm run typecheck` | TypeScript denetimi |
| `npm run build` | `dist/` üretimi |

**Kamera testi HTTPS gerektirir.** `localhost` güvenli bağlam sayıldığı için makinede çalışır, ama
telefondan LAN IP'siyle (`http://192.168...`) girildiğinde kamera açılmaz — gerçek çift telefon testini
yayındaki adreste yapın. O zamana kadar her ekranda bulunan "kodu yapıştır" yolu iş görür.

## Yayına alma

`main` dalına yapılan her push, `.github/workflows/deploy.yml` ile GitHub Pages'e dağıtır.

## Yapı

```
src/
  lib/crypto.ts     PBKDF2 türetme, HMAC imzalama/doğrulama
  lib/coupon.ts     Kupon paketleme/çözme, tazelik kontrolü
  lib/store.ts      localStorage durumu, bakiye, defter, yedek
  lib/scanner.ts    BarcodeDetector + ZXing yedeği
  components/       Coin, MemberCard, StampCard, QrView, Scanner, Sheet, Confetti
  screens/          Setup, Lock, Wallet, Award, Scan, Rewards, History, Settings
```
