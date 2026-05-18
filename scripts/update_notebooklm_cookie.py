import json
import os

cookie_str = "__Secure-BUCKET=CMsF; AEC=AaJma5tSY4bs9WVNZZ9vIXkuJKdCyZTV37dFT7uUZ-nG7b4PBG5iFS76Mw; HSID=Afrey0NqeLUCgunkr; SSID=AN6gBNd_4ER1iCbJW; APISID=aaawhPTzgHQJl0y-/Apsq_MK6EwB1Zto8S; SAPISID=WR7tHoTcrFMjMuEz/Ar9LTbPYkobVqTd-h; __Secure-1PAPISID=WR7tHoTcrFMjMuEz/Ar9LTbPYkobVqTd-h; __Secure-3PAPISID=WR7tHoTcrFMjMuEz/Ar9LTbPYkobVqTd-h; SID=g.a000-AhP2QIyJHxE9wAn5CmR98LyaJQh_DaAbv5A3yqdpg8gIJ4vJMR3hnkRuPXlsKmkHdkaCwACgYKATwSARMSFQHGX2Mip_780VKh5pDFSAzEg6ZRiBoVAUF8yKqcqgCpOJmd5dguCgRmZZ9Z0076; __Secure-1PSID=g.a000-AhP2QIyJHxE9wAn5CmR98LyaJQh_DaAbv5A3yqdpg8gIJ4vbYwJlwpyhRO-e_IV8N6B0wACgYKAZgSARMSFQHGX2MiTyB_ywsvuKTKpZxWOH6GcxoVAUF8yKraYfcOvGNl3b5ipQ9srPxo0076; __Secure-3PSID=g.a000-AhP2QIyJHxE9wAn5CmR98LyaJQh_DaAbv5A3yqdpg8gIJ4vwJ5vHnw61z2Fu7ClpLwDgAACgYKAdASARMSFQHGX2MiGtEmFX_3DbENHB7gM6djLBoVAUF8yKrLgWIkzWOHGpAFJIRyXJT60076; SEARCH_SAMESITE=CgQI7qAB; OSID=g.a000-AhP2eZZvEP8sJxxuOi_zSYdXe8yx6OdlPl4BVQ2DWPaLFYo-yNdakS7r1Dv4UgEPKekCwACgYKATYSARMSFQHGX2MikCN5yYy5qhDiAty4kwwtvBoVAUF8yKpfQj7tQToOI0GMUiRlzdh40076; __Secure-OSID=g.a000-AhP2eZZvEP8sJxxuOi_zSYdXe8yx6OdlPl4BVQ2DWPaLFYo4sJVCzLuJ45ZpuR10cRrkgACgYKAb8SARMSFQHGX2Mi7qWwaR6QyZruDLkvVN3xIBoVAUF8yKpJ4rHlnNj1hK6jRm3IXC4u0076; _gcl_au=1.1.1549646573.1778996467; _ga=GA1.1.774767396.1778996468; NID=531=bFAj_eAlboL1Ap5tp86qV27K0baKSu9JCpxI24rungjpQOk4HyrmKCxWEsFU0JvFUO8Ou7nVcI7SsZzRzTug8gdFP7zoWerzaLDJhtvq3SmcT-wYKD0ljLkmDhNTbX6S1Z3uLJoCn4cgdWDCkTl55GNgCxm12nhjVH4CiIa7pgQrIBT01Ww7cdRfNmwHNJCRRFJ0CHywG5UVs_SlO6r2F0amloNDh0yUvLzrMNdEejlIeJLWx7Hx_jhCWh10qsKrXf1OOrVrc5EW8hezM3vy0gHbMUDk8HvHezeHpqctTapsMpLgPEBSUYsL0ekA6o97ATC3mnAO7LkIq10dHQLXx7yRUZJs38tS4sNTmBJu1gUlD6ObxcosKCqixvH4n4O3BM3Wr6JzXzb47HE3jLrGkng1QEuFMW0pPd9_xVo3ebESYsLgE8hLXAB5aOgBssZw_24mJ7kEYgWUQg-X2HfipXNkCaKRvW7iJTDR9xZketgqQVUnHdRdWrI0EnPlYd-I7UZrv-1vVHzfHOte5XU-C6ebC0GYT_tUm0lJLZ33S4hicGDddfIJkTSZv6_th40nfhUWzQXUIkDWEiDf00l-fFdSSQG8C4oIY9DWVE49guZ8m2YZzkgnYkESPTPaED_deqOvo6epzmjs_-rmNIDxYfnI8SUZNpylmbz-u7Tw8kiZEL6Ff3vLrhs6VdlvMywzlEMP4cZnlHlUNTGLaKsBv6fHVhlUXoK5bmwi3EfaJeRB3QhpUyybxRg2rfOcoOZ9Qj-Zf2GhOaOQuG25ot7DtdFz3EIZ0B-FUdCcTVo0i7jzGsW_b-tAKq4zPjM; __Secure-1PSIDTS=sidts-CjcBhkeRd_nIIStMbJFx5O3m0mlRPt1Zn_2PBRGvz-W8Ll2auB8vGqOGiwLhFGjGQRfu89w1zTkmEAA; __Secure-1PSIDRTS=sidts-CjcBhkeRd_nIIStMbJFx5O3m0mlRPt1Zn_2PBRGvz-W8Ll2auB8vGqOGiwLhFGjGQRfu89w1zTkmEAA; __Secure-3PSIDTS=sidts-CjcBhkeRd_nIIStMbJFx5O3m0mlRPt1Zn_2PBRGvz-W8Ll2auB8vGqOGiwLhFGjGQRfu89w1zTkmEAA; __Secure-3PSIDRTS=sidts-CjcBhkeRd_nIIStMbJFx5O3m0mlRPt1Zn_2PBRGvz-W8Ll2auB8vGqOGiwLhFGjGQRfu89w1zTkmEAA; _ga_W0LDH41ZCB=GS2.1.s1779068808$o3$g1$t1779068809$j59$l0$h0; SIDCC=AKEyXzV7UAfM9lvCsCWqpJXdAHzBE4TJxupHgsBf84jovhhb0kah3xI0FtmSANA1Nn7O_DW3vQ; __Secure-1PSIDCC=AKEyXzV0EHppwSvMRTvhX-aM8ulhipOBQbRilx4IF9m0o_jK5Jm2JL0sQegI6tBi1slVZsmeAoA; __Secure-3PSIDCC=AKEyXzUoGkqYWebp7rIssNOr1BpIhpefjoTQdFLgxzx5nEQQYhMzgsX8BkfidHxIt3x_RyFdkQ"

cookies_list = []
for pair in cookie_str.split(';'):
    pair = pair.strip()
    if '=' in pair:
        name, value = pair.split('=', 1)
        cookies_list.append({
            "name": name,
            "value": value,
            "domain": ".google.com",
            "path": "/",
            "expires": 4102444800, # 2100
            "httpOnly": False,
            "secure": True,
            "sameSite": "Lax"
        })

state_file = r"C:\Users\Administrator\.notebooklm\profiles\default\storage_state.json"
os.makedirs(os.path.dirname(state_file), exist_ok=True)

data = {"cookies": cookies_list, "origins": []}
if os.path.exists(state_file):
    try:
        with open(state_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Remove old google.com cookies
            data["cookies"] = [c for c in data.get("cookies", []) if ".google.com" not in c.get("domain", "")]
            # Add new ones
            data["cookies"].extend(cookies_list)
    except:
        pass

with open(state_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Cookie updated in storage_state.json")
