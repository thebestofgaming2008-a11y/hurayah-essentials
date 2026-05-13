import { mutation } from "./_generated/server";
import { nowIso } from "./lib";

const FILES_TEXT = `
1773570053698-v3uula.png
1773570061037-hbnanw.png
1775617079978-6ebex3.png
1775841372594-bicl6u.png
1775894178980-74tdlr.png
1775894265802-kgycfj.png
1775894267675-8euzoa.png
1775894268812-ldqhyi.png
1775894269882-87k200.png
1775894272239-3jgj7b.png
1775895541690-jmf20w.png
1775895800993-o8hc3r.png
1775895825163-ieq8t4.png
1775895877886-szsnr3.png
1775895970290-atw0id.png
1775896008256-m2pxu9.png
1775896038074-2qerbj.png
1775896073911-frgupy.png
1775896857876-khg4ji.png
1775899527882-wkvc92.png
1776001262701-8nq4zg.png
1776001322089-hwprkn.png
1776001351990-lx876p.png
1776001362122-8thevj.png
1776001374327-t1zg7l.png
1776001389486-j9082d.png
1776001425890-rwodzt.png
1776001533569-lkjnxy.png
1776001535392-2avrjt.png
1776001536168-grulgq.png
1776001537005-ceyljr.png
1776001538023-9wr9ur.png
1776001538909-gnsc7x.png
1776001898655-aonxwj.png
1776001899578-cm9fcm.png
1776001900463-aonipg.png
1776001901274-tm5xm0.png
1776001901989-0a8mgt.png
1776001919558-nnfmhi.png
1776001929349-jzrjhc.png
1776001946794-uwon9d.png
1776001966707-5riykj.png
1776001985075-sfuh9a.png
1776002020434-oapds6.png
1776002044815-u8jla7.png
1776002107175-8mesj8.png
1776002171162-gmxrve.png
1776002211409-7inh7t.png
1776002235343-ezhrj6.png
1776002250255-uhv5ep.png
1776002278370-52yw2g.png
1776002327132-kymrwr.png
1776002348073-eoqhvi.png
1776002374805-gl0u7j.png
1776002453586-bvml0s.png
1776002534064-dxebut.png
1776002563531-t3lt5y.png
1776002592178-kedb59.png
1776002656169-dupwgt.png
1776002700678-rycduy.png
1776002757662-ofn2ft.png
1776002774385-gwyoy6.png
1776002793989-3csxic.png
1776002866807-5xlvps.png
1776003629514-fcgzco.png
1776003650372-f15b5b.png
1776003671634-zeczd8.png
1776070776778-8yvsyc.png
1776070815990-ku4rz5.png
1776071081975-kuo0hz.png
1776173808998-va9se4.png
1776173834716-f25wr0.png
1776682871129-aa6wq0.png
1776682908964-elssz0.png
1776682955069-byzklv.png
1776683013881-syg2lk.png
1776683033550-i1w55s.png
1776683124393-301o21.png
1776683168296-dphazs.png
1776683193914-qxr487.png
1776683229923-rlrkg0.png
1776683259603-6pvsxm.png
1776683474504-kd3ap9.png
1776958981121-etf98s.png
1776959106848-25ux1q.png
1776959128276-nzee2s.png
1776959135235-478ikr.png
1776959152780-mamel7.png
1776959227278-ofx1da.png
1776959247401-krn618.png
1776959273807-ocnla6.png
1776961684548-vlz5hp.png
1776961707542-54sf6n.png
1777529557681-591wws.png
1777532859453-f9ifhc.png
1777533125092-b1miln.png
1777533211186-k8ltse.png
1777533329511-9idlgl.png
1777549313078-eb8s3r.png
1777549596883-tcl44i.png
1777549854890-imdqy3.png
1777549898175-awsbff.png
1777550032408-cblef2.png
1777550113811-b9i5jn.png
1777550256956-c5m7wj.png
1777550381734-1rn78x.png
1777550501101-7w1l3d.png
1777553343229-syz6n7.png
1777610753490-q2n4vv.png
1777610879485-i7lye3.png
1777611063746-ikxqk4.png
1777611201693-7w4bq4.png
1777611265633-uznywz.png
1777611284304-6fi0xt.png
1777611403963-rrh9ud.png
1777611428756-82v5if.png
1777611565155-kz0s3z.png
1777611666608-qquvif.png
1777611877246-oasb85.png
1777612049772-hds8b4.png
1777612519613-icyqu7.png
1777612710016-dq4r11.png
1777612842262-yzmjp2.png
1777613005703-zxse3j.png
1777630273063-d9d2t1.png
1777630360176-lix0ih.png
1777630453000-xitvqq.png
1777630804447-l581y9.png
1777630978827-t23kji.png
1777632049350-4pumgr.png
1777632126516-owzxxw.png
1777632351380-gfy0j1.png
1777632393816-behrxu.png
1777637857501-izv0ep.png
1777637882718-ng8rpa.png
1777638078386-wpn7i4.png
1777638840952-59luc6.png
1777651495715-v9rjzu.png
1777651665822-oo00yo.png
1777802191634-rcgl0w.png
1777802342034-5hct78.png
1777802905436-pruver.png
1777803058108-a8rzsp.png
1777803145414-al4rge.png
1777803252697-7v1tl2.png
`;

const VISIBLE_TITLES = [
  "Black Niqab Face Veil",
  "Black Full-Length Khimar",
  "Arabic Qur'an Edition",
  "Important Lessons for Every Muslim",
  "Three Fundamental Principles of Islam",
  "Characteristics of Hypocrites",
  "Heartfelt Advice to a Friend",
  "Paragons of the Qur'an",
  "Inner Dimensions of the Prayer",
  "Trials and Tribulations",
  "Kitab At-Tawhid",
  "The Disease and the Cure",
  "Captured Thoughts",
  "Tajweed Qur'an",
  "My Advice to the Women",
  "Commentary on Kitab At-Tawheed",
  "Kitab At-Tawhid",
  "Friends of Allah and Friends of Shaytan",
  "Tajweed Qur'an Set",
  "The Noble Qur'an",
  "Ranks of the Divine Seekers",
  "The Devil's Deceptions",
  "The Principle of Love and Desire",
  "The Journey of the Strangers",
  "The Book of Major Sins",
  "The Evils of Music",
  "Explanation to the Beautiful and Perfect Names of Allah",
  "Sickness: Fools and Simpletons",
  "Seeds of Admonishment and Reform",
  "Disturber of the Hearts",
  "Awaking from the Sleep of Heedlessness",
  "Sincere Counsel to the Students of Sacred Knowledge",
  "Disciplining the Soul",
  "At Their Feet: Piety Towards Parents",
  "Sickness: Fools and Simpletons",
  "Seeds of Admonishment and Reform",
  "Disturber of the Hearts",
  "Awaking from the Sleep of Heedlessness",
  "Kitab Al-Iman: Book of Faith",
  "Kitab Al-Iman: Book of Faith",
  "Historical Marvels of the Qur'an",
  "The Etiquette of Seeking Knowledge",
  "The Foremost Obligatory Duties",
  "Semblance of Bitter Nights in Believing Men",
  "When the Moon Split",
  "Diseases of the Hearts and Their Cures",
  "The Sealed Nectar",
  "Wives of the Prophet",
  "Foundations of the Sunnah",
  "The Dress Code for Muslim Women",
  "The Zanaadiqah and Jahmiyyah",
  "More than 1,000 Sunan Every Day and Night",
  "Summarized Sahih Muslim Volume 1",
  "Arabic Islamic Creed Book",
  "Removal of Doubts",
  "20 Pieces of Advice to My Sister Before Marriage",
  "The Marriage Guide",
  "Great Women of Islam",
  "Riyad-us-Saliheen",
  "Urdu Women's Book",
  "Rising as a Family",
  "The Relief from Distress",
  "Ibn Taymiyyah Expounds on Islam",
  "Remembrance of the Most Merciful",
  "Golden Supplications for Children",
  "Rizo: Lawful Earnings",
  "Life After Death and the Unseen",
  "The Islamic Awakening",
  "The Sublime Beauty of the Prophet",
  "Rulings Pertaining to Muslim Women",
  "In Defence of True Faith",
  "How to Escape Sins",
  "Questions Related to Jinn, Magic and Conjuring",
  "Arabic Riyad-us-Saliheen",
  "Abodes of Happiness",
  "Urdu Women's Islamic Book",
  "Sifto Sala-tin-Nabi",
  "Urdu Qur'an Commentary",
  "Qasas al-Anbiya",
  "Sharh Al-Aqeedah Al-Wasitiyah",
  "Guide to Sound Creed",
  "Al-Adab Al-Mufrad",
  "Arabic Course for English Speaking Students 1",
  "Brown Crochet Kufi Cap",
  "White Crochet Kufi Cap",
  "Black Crochet Kufi Cap",
  "Black Pattern Crochet Kufi Cap",
  "Bright Green Crochet Kufi Cap",
  "Olive Crochet Kufi Cap",
  "Cream Crochet Kufi Cap",
  "Navy Crochet Kufi Cap",
  "Navy Pattern Crochet Kufi Cap",
  "Dark Navy Crochet Kufi Cap",
];

function files() {
  return FILES_TEXT.split("\n").map((file) => file.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

function catalogName(index: number) {
  if (VISIBLE_TITLES[index]) return VISIBLE_TITLES[index];
  const arabicIndex = index - VISIBLE_TITLES.length + 1;
  return `Arabic and Urdu Islamic Book ${arabicIndex}`;
}

function categoryFor(name: string, index: number) {
  if (index < 2 || name.includes("Kufi") || name.includes("Khimar") || name.includes("Niqab")) return index < 2 ? "women" : "clothing";
  if (name.includes("Women") || name.includes("Marriage") || name.includes("Sister")) return "women";
  if (name.includes("Children")) return "children";
  return "books";
}

function priceFor(name: string, index: number) {
  if (index < 2) return 299;
  if (name.includes("Kufi")) return 99;
  if (name.includes("Set")) return 1200;
  if (name.includes("Qur'an") || name.includes("Riyad")) return 650;
  if (name.startsWith("Arabic and Urdu")) return 220;
  return 250;
}

type CatalogPatch = {
  name?: string;
  short_description?: string;
  description?: string;
  author?: string | null;
  publisher?: string | null;
  language?: string | null;
  pages?: number | null;
  isbn?: string | null;
  binding?: string | null;
  edition?: string | null;
  category?: string;
  tags?: string[];
  price_inr?: number;
  variant_label?: string | null;
  badge?: string | null;
};

const curatedByFile: Record<string, CatalogPatch> = {
  "1776002171162-gmxrve.png": {
    name: "The Sealed Nectar",
    short_description: "Award-winning seerah of Prophet Muhammad ﷺ by Safiur Rahman Mubarakpuri.",
    description: "A detailed, accessible biography of Prophet Muhammad ﷺ, widely used by students and families. Verified publisher metadata from Darussalam listings.",
    author: "Safiur Rahman Mubarakpuri",
    publisher: "Darussalam",
    language: "English",
    binding: "Hardcover",
    category: "books",
    tags: ["Seerah", "Biography", "Darussalam"],
    price_inr: 650,
    variant_label: "English hardcover",
    badge: "Classic",
  },
  "1776002592178-kedb59.png": {
    name: "Great Women of Islam",
    short_description: "True stories of the Mothers of the Believers and great women companions.",
    description: "Covers the lives of the Mothers of the Believers and sixteen women companions who were given glad tidings of Paradise. Metadata verified against Darussalam and Dar-us-Salam listings.",
    author: "Mahmood Ahmad Ghadanfar",
    publisher: "Darussalam",
    language: "English",
    pages: 272,
    isbn: "9789960897271",
    binding: "Hardcover",
    edition: "2003",
    category: "women",
    tags: ["Women", "Sahabiyat", "Darussalam"],
    price_inr: 650,
    variant_label: "English hardcover",
    badge: "Recommended",
  },
  "1776683474504-kd3ap9.png": {
    name: "Arabic Course for English-Speaking Students - Volume 1",
    short_description: "Madinah Islamic University Arabic course for non-Arabic speakers.",
    description: "A foundational Arabic course originally devised and taught at the Islamic University of Madinah. Darussalam listings identify Dr. V. Abdur Rahim as author with hardcover editions under ISBN 9789960986074.",
    author: "Dr. V. Abdur Rahim",
    publisher: "Darussalam",
    language: "English / Arabic",
    pages: 162,
    isbn: "9789960986074",
    binding: "Hardcover",
    category: "books",
    tags: ["Arabic", "Language", "Darussalam"],
    price_inr: 950,
    variant_label: "Volume 1",
    badge: "Study",
  },
  "1775899527882-wkvc92.png": {
    name: "The Noble Qur'an",
    short_description: "Arabic-English Qur'an translation by Dr. Muhammad Taqi-ud-Din Al-Hilali and Dr. Muhammad Muhsin Khan.",
    description: "Arabic text with English meaning and concise explanatory notes. Darussalam listings describe this family of editions as hardcover Arabic-English Qur'an translations.",
    author: "Dr. Muhammad Taqi-ud-Din Al-Hilali and Dr. Muhammad Muhsin Khan",
    publisher: "Darussalam",
    language: "Arabic / English",
    pages: 687,
    binding: "Hardcover",
    category: "books",
    tags: ["Qur'an", "Translation", "Darussalam"],
    price_inr: 950,
    variant_label: "Arabic-English hardcover",
    badge: "Bestseller",
  },
  "1776002656169-dupwgt.png": {
    name: "Riyad-us-Saliheen",
    short_description: "Classic hadith collection arranged by Imam an-Nawawi.",
    description: "A widely studied collection of hadith covering worship, manners, purification of the soul, and daily Muslim conduct.",
    author: "Imam an-Nawawi",
    publisher: "Darussalam",
    language: "English",
    binding: "Hardcover",
    category: "books",
    tags: ["Hadith", "Darussalam"],
    price_inr: 850,
    variant_label: "English hardcover",
    badge: "Classic",
  },
};

const galleryGroups = [
  {
    label: "Sickness: Fools and Simpletons",
    files: ["1776001533569-lkjnxy.png", "1776001899578-cm9fcm.png"],
  },
  {
    label: "Seeds of Admonishment and Reform",
    files: ["1776001535392-2avrjt.png", "1776001900463-aonipg.png"],
  },
  {
    label: "Disturber of the Hearts",
    files: ["1776001536168-grulgq.png", "1776001901274-tm5xm0.png"],
  },
  {
    label: "Awaking from the Sleep of Heedlessness",
    files: ["1776001537005-ceyljr.png", "1776001901989-0a8mgt.png"],
  },
  {
    label: "Kitab Al-Iman: Book of Faith",
    files: ["1776001919558-nnfmhi.png", "1776001929349-jzrjhc.png"],
  },
];

const variantGroups = [
  {
    family: "Crochet Kufi Cap",
    files: [
      ["1776958981121-etf98s.png", "Brown"],
      ["1776959106848-25ux1q.png", "White"],
      ["1776959128276-nzee2s.png", "Black"],
      ["1776959135235-478ikr.png", "Black pattern"],
      ["1776959152780-mamel7.png", "Bright green"],
      ["1776959227278-ofx1da.png", "Olive"],
      ["1776959247401-krn618.png", "Cream"],
      ["1776959273807-ocnla6.png", "Navy"],
      ["1776961684548-vlz5hp.png", "Navy pattern"],
      ["1776961707542-54sf6n.png", "Dark navy"],
    ],
  },
  {
    family: "Kitab At-Tawhid",
    files: [
      ["1775895541690-jmf20w.png", "Pocket edition"],
      ["1775896038074-2qerbj.png", "Commentary edition"],
    ],
  },
  {
    family: "Qur'an Editions",
    files: [
      ["1775895877886-szsnr3.png", "Tajweed edition"],
      ["1775896857876-khg4ji.png", "Tajweed set"],
      ["1775899527882-wkvc92.png", "Arabic-English hardcover"],
    ],
  },
];

function fileFromUrl(url: string | null | undefined) {
  return String(url ?? "").split("/").pop() ?? "";
}

export const importPhotoRoomProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const timestamp = nowIso();
    let inserted = 0;
    let skipped = 0;

    for (const [index, file] of files().entries()) {
      const name = catalogName(index);
      const slug = `photoroom-${slugify(name)}-${file.replace(/\.png$/i, "")}`;
      const existing = await ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
      if (existing) {
        skipped += 1;
        continue;
      }
      const category = categoryFor(name, index);
      const price = priceFor(name, index);
      await ctx.db.insert("products", {
        name,
        slug,
        short_description: `${name} imported from the Hurayah Essentials Photoroom catalog.`,
        description: `${name}. Please review publisher, author, edition, stock, and final retail price in the admin dashboard before going live.`,
        author: null,
        publisher: "Hurayah Essentials",
        language: name.startsWith("Arabic and Urdu") || name.includes("Urdu") || name.includes("Arabic") ? "Arabic / Urdu" : "English",
        pages: null,
        isbn: null,
        binding: index < 2 || category === "clothing" ? null : "Paperback",
        edition: null,
        price,
        price_inr: price,
        sale_price: null,
        sale_price_inr: null,
        sku: `PR-${file.replace(/\.png$/i, "").toUpperCase()}`,
        stock_quantity: 10,
        category,
        category_id: category,
        tags: ["Imported", category === "books" ? "Books" : category],
        cover_image_url: `/photoroom/${file}`,
        images: [`/photoroom/${file}`],
        linked_product_ids: [],
        variant_label: null,
        badge: index < 12 ? "New" : null,
        rating: null,
        reviews_count: 0,
        is_active: true,
        is_featured: index < 12,
        is_new_arrival: true,
        is_bestseller: false,
        is_on_sale: false,
        in_stock: true,
        created_at: timestamp,
        updated_at: timestamp,
      });
      inserted += 1;
    }
    return { inserted, skipped, total: files().length };
  },
});

export const curatePhotoRoomCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const timestamp = nowIso();
    const rows = await ctx.db.query("products").collect();
    const byFile = new Map<string, any>();
    for (const product of rows) {
      const file = fileFromUrl(product.cover_image_url);
      if (file) byFile.set(file, product);
    }

    let enriched = 0;
    let grouped = 0;
    let linked = 0;
    let archived = 0;

    for (const [file, patch] of Object.entries(curatedByFile)) {
      const product = byFile.get(file);
      if (!product) continue;
      const price = patch.price_inr ?? product.price_inr ?? product.price;
      await ctx.db.patch(product._id, {
        ...patch,
        price,
        price_inr: price,
        category_id: patch.category ?? product.category_id ?? product.category,
        in_stock: (product.stock_quantity ?? 0) > 0,
        updated_at: timestamp,
      });
      enriched += 1;
    }

    for (const group of galleryGroups) {
      const products = group.files.map((file) => byFile.get(file)).filter(Boolean);
      const primary = products[0];
      if (!primary) continue;
      const imageUrls = group.files.map((file) => `/photoroom/${file}`);
      await ctx.db.patch(primary._id, {
        name: group.label,
        short_description: `${group.label} with all available Hurayah product images grouped into one listing.`,
        description: `${group.label}. This listing now contains the available cover/gallery images that were previously split into duplicate products.`,
        images: imageUrls,
        cover_image_url: imageUrls[0],
        is_active: true,
        updated_at: timestamp,
      });
      grouped += 1;
      for (const duplicate of products.slice(1)) {
        await ctx.db.patch(duplicate._id, {
          is_active: false,
          badge: "Merged",
          updated_at: timestamp,
        });
        archived += 1;
      }
    }

    for (const group of variantGroups) {
      const products = group.files.map(([file, label]) => ({ product: byFile.get(file), label })).filter((item) => item.product);
      const ids = products.map((item) => String(item.product._id));
      for (const item of products) {
        const product = item.product;
        const familyName = group.family === "Crochet Kufi Cap" ? `${item.label} ${group.family}` : product.name;
        await ctx.db.patch(product._id, {
          name: familyName,
          short_description:
            group.family === "Crochet Kufi Cap"
              ? `${item.label} crochet kufi cap. Select other colors from the variant options.`
              : product.short_description,
          category: group.family === "Crochet Kufi Cap" ? "clothing" : product.category,
          category_id: group.family === "Crochet Kufi Cap" ? "clothing" : product.category_id,
          tags: group.family === "Crochet Kufi Cap" ? ["Kufi", "Cap", "Clothing"] : product.tags,
          linked_product_ids: ids.filter((id) => id !== String(product._id)),
          variant_label: item.label,
          price: group.family === "Crochet Kufi Cap" ? 99 : product.price,
          price_inr: group.family === "Crochet Kufi Cap" ? 99 : product.price_inr,
          updated_at: timestamp,
        });
        linked += 1;
      }
    }

    return { enriched, grouped, linked, archived };
  },
});
