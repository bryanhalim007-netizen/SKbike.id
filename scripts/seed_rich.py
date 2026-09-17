import os, requests

API = os.environ.get("API_BASE") or "http://localhost:8001/api"
EMAIL = "admin@skbike.id"
PASSWORD = "Admin@12345"

MTB = {
    "mtb_red": "https://static.prod-images.emergentagent.com/jobs/13b8c960-e6cf-4f0c-b083-02c7c18c2969/images/f948615028421c8519b6c0e4fc73dea6b4fa4996d3034e3bee3d27e145b1d9b5.jpeg",
    "mtb_black": "https://static.prod-images.emergentagent.com/jobs/13b8c960-e6cf-4f0c-b083-02c7c18c2969/images/242225137606c00c74b5585acc17caa5159b21825e52e93b8a4b89d25fa58d37.jpeg",
    "mtb_teal": "https://static.prod-images.emergentagent.com/jobs/13b8c960-e6cf-4f0c-b083-02c7c18c2969/images/87b05a9d604799c16066be7748f2fe68e85c6dff072b6666b309e604e22a9564.jpeg",
}
EBIKE = {
    "ebike_white": "https://static.prod-images.emergentagent.com/jobs/13b8c960-e6cf-4f0c-b083-02c7c18c2969/images/d006b15b5368958337001edb53abc24e85459fe87296c46bc5731b78890c72e6.jpeg",
    "ebike_orange": "https://static.prod-images.emergentagent.com/jobs/13b8c960-e6cf-4f0c-b083-02c7c18c2969/images/89317dd50a4fe26e187f587f3f17cd66b1cd0b665aa862e71969abd30a2959bd.jpeg",
    "ebike_navy": "https://static.prod-images.emergentagent.com/jobs/13b8c960-e6cf-4f0c-b083-02c7c18c2969/images/515273caa037184a3e2530bd98034231e0939c0cb26237c9575b6baeea842af2.jpeg",
}

products = [
    {
        "name": "SK Velocity Trail 29",
        "code": "MTB-VT29",
        "category": "Sepeda Gunung",
        "description": "Sepeda gunung hardtail premium dengan frame alloy ringan, cocok untuk trail teknikal maupun harian. Tersedia dalam beberapa pilihan warna.",
        "price": 4500000, "cost_price": 3500000, "status": "Tersedia",
        "image_url": MTB["mtb_red"], "supplier": "SK Distribusi",
        "specs": {"frame": "Aluminium Alloy 6061", "transmisi": "Shimano Deore 12-Speed", "rem": "Hydraulic Disc Brake", "ukuran_roda": "29 inci", "baterai_motor": ""},
        "variants": [
            {"color": "Merah", "stock": 8, "hex": "#DC2626", "image_url": MTB["mtb_red"]},
            {"color": "Hitam", "stock": 5, "hex": "#111111", "image_url": MTB["mtb_black"]},
            {"color": "Teal", "stock": 3, "hex": "#14B8A6", "image_url": MTB["mtb_teal"]},
        ],
    },
    {
        "name": "SK Urban E-Move",
        "code": "EB-UEM",
        "category": "Sepeda Listrik",
        "description": "Sepeda listrik urban dengan baterai terintegrasi, jangkauan jauh dan desain elegan untuk mobilitas kota sehari-hari. Pilih warna favoritmu.",
        "price": 12500000, "cost_price": 9800000, "status": "Tersedia",
        "image_url": EBIKE["ebike_white"], "supplier": "SK Distribusi",
        "specs": {"frame": "Aluminium Alloy", "transmisi": "Shimano 7-Speed", "rem": "Hydraulic Disc Brake", "ukuran_roda": "27.5 inci", "baterai_motor": "48V 15Ah • Motor 350W"},
        "variants": [
            {"color": "Putih", "stock": 6, "hex": "#E5E7EB", "image_url": EBIKE["ebike_white"]},
            {"color": "Oranye", "stock": 4, "hex": "#F97316", "image_url": EBIKE["ebike_orange"]},
            {"color": "Navy", "stock": 7, "hex": "#1E3A5F", "image_url": EBIKE["ebike_navy"]},
        ],
    },
]

s = requests.Session()
r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
r.raise_for_status()
token = r.json().get("token")
headers = {"Authorization": f"Bearer {token}"}

existing = s.get(f"{API}/admin/products", headers=headers).json()
existing_codes = {p.get("code") for p in existing}

for p in products:
    if p["code"] in existing_codes:
        print(f"SKIP (exists): {p['name']} ({p['code']})")
        continue
    resp = s.post(f"{API}/admin/products", headers=headers, json=p)
    if resp.status_code < 300:
        print(f"CREATED: {p['name']} -> id {resp.json().get('id')}")
    else:
        print(f"FAIL {p['name']}: {resp.status_code} {resp.text[:200]}")
