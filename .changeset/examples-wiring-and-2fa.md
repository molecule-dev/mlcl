---
'mlcl': patch
---

The two-factor example enrolls through `@molecule/api-resource-user`'s own route, so the next login asks for the code; the magic-link example issues a session only once per link; and the auth, realtime, form, AI and job examples say where to mount their routes and what to configure.
