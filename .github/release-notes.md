No-limit Texas Hold’em against computer players. Plays fully offline.

## Download

| System | File |
| --- | --- |
| Windows 10 and 11 | `Holdem-{{VERSION}}-windows-x64.exe` |
| Ubuntu, Debian, Mint, Pop!_OS | `holdem_{{VERSION}}_amd64.deb` |
| Any Linux (64-bit Intel/AMD) | `holdem-{{VERSION}}-linux-x64.tar.gz` |
| Raspberry Pi 4/5 and other 64-bit ARM Linux | `holdem-{{VERSION}}-linux-arm64.tar.gz` |

## Install

**Windows:** download the .exe and double-click it; there’s nothing to install. Windows may show
“Windows protected your PC” because the app isn’t code-signed: click **More info**, then **Run anyway**.
It needs Microsoft’s WebView2, which Windows 11 and up-to-date Windows 10 already include.

**Ubuntu and Debian-based:** `sudo apt install ./holdem_{{VERSION}}_amd64.deb`, then open Hold’em from
your app menu.

**Other Linux:** extract the tarball and run `./install.sh` (no sudo needed). It needs WebKitGTK,
which most desktop distros include.

`SHA256SUMS.txt` lists checksums so you can verify a download: `sha256sum -c SHA256SUMS.txt --ignore-missing`.
