#!/usr/bin/env bash
# Builds Linux packages from the desktop build in release/holdem/:
#   release/linux/holdem_<version>_amd64.deb      (Debian, Ubuntu, Mint, Pop!_OS…)
#   release/linux/holdem-<version>-linux-x64.tar.gz (any distro, installs into your home folder)
#   release/linux/holdem-<version>-linux-arm64.tar.gz (Raspberry Pi 4/5 and other 64-bit ARM)
# Run via: npm run linux
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
OUT=release/linux
rm -rf "$OUT" && mkdir -p "$OUT"

# The binary must always be named "holdem": WebKitGTK keeps saved accounts in ~/.local/share/<binary name>.
DESKTOP_ENTRY='[Desktop Entry]
Type=Application
Name=Hold’em
GenericName=Poker
Comment=No-limit Texas Hold’em against computer players
Exec=EXEC_PATH
Icon=holdem
Terminal=false
Categories=Game;CardGame;
Keywords=poker;holdem;cards;
StartupWMClass=Holdem'

# ---------- portable tarballs ----------
for arch in x64 arm64; do
  dir="$OUT/holdem-$VERSION-linux-$arch"
  mkdir -p "$dir"
  cp "release/holdem/holdem-linux_$arch" "$dir/holdem"
  chmod 755 "$dir/holdem"
  cp public/pwa-512.png "$dir/holdem.png"
  cat > "$dir/install.sh" <<'SH'
#!/usr/bin/env bash
# Installs Hold'em for the current user (no sudo needed).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p ~/.local/bin ~/.local/share/applications ~/.local/share/icons/hicolor/512x512/apps
install -m 755 "$here/holdem" ~/.local/bin/holdem
install -m 644 "$here/holdem.png" ~/.local/share/icons/hicolor/512x512/apps/holdem.png
sed "s#EXEC_PATH#$HOME/.local/bin/holdem#" "$here/holdem.desktop" > ~/.local/share/applications/holdem.desktop
command -v update-desktop-database >/dev/null && update-desktop-database ~/.local/share/applications || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q ~/.local/share/icons/hicolor 2>/dev/null || true
echo "Installed. Open Hold’em from your app menu, or run: ~/.local/bin/holdem"
SH
  cat > "$dir/uninstall.sh" <<'SH'
#!/usr/bin/env bash
# Removes the app. Your accounts in ~/.local/share/holdem are kept unless you pass --purge.
rm -f ~/.local/bin/holdem ~/.local/share/applications/holdem.desktop ~/.local/share/icons/hicolor/512x512/apps/holdem.png
[ "${1:-}" = "--purge" ] && rm -rf ~/.local/share/holdem ~/.cache/holdem && echo "Removed the app and its saved accounts." || echo "Removed the app. Saved accounts are still in ~/.local/share/holdem."
SH
  chmod 755 "$dir/install.sh" "$dir/uninstall.sh"
  echo "$DESKTOP_ENTRY" > "$dir/holdem.desktop"
  tar -C "$OUT" -czf "$OUT/holdem-$VERSION-linux-$arch.tar.gz" "holdem-$VERSION-linux-$arch"
  rm -rf "$dir"
done

# ---------- .deb (amd64) ----------
pkg="$OUT/deb"
mkdir -p "$pkg/DEBIAN" "$pkg/opt/holdem" "$pkg/usr/bin" "$pkg/usr/share/applications"
install -m 755 release/holdem/holdem-linux_x64 "$pkg/opt/holdem/holdem"
ln -s /opt/holdem/holdem "$pkg/usr/bin/holdem"
for size in 192 512; do
  mkdir -p "$pkg/usr/share/icons/hicolor/${size}x${size}/apps"
  install -m 644 "public/pwa-$size.png" "$pkg/usr/share/icons/hicolor/${size}x${size}/apps/holdem.png"
done
echo "$DESKTOP_ENTRY" | sed 's#EXEC_PATH#/usr/bin/holdem#' > "$pkg/usr/share/applications/holdem.desktop"
cat > "$pkg/DEBIAN/control" <<CTRL
Package: holdem
Version: $VERSION
Section: games
Priority: optional
Architecture: amd64
Depends: libgtk-3-0t64 | libgtk-3-0, libwebkit2gtk-4.1-0 | libwebkit2gtk-4.0-37
Installed-Size: $(du -sk "$pkg" | cut -f1)
Maintainer: Hold'em <holdem@localhost>
Description: No-limit Texas Hold'em against computer players
 A desktop poker table with five computer opponents, accounts,
 player profiles and results tracking. Plays fully offline.
CTRL
cat > "$pkg/DEBIAN/postinst" <<'SH'
#!/bin/sh
set -e
command -v update-desktop-database >/dev/null && update-desktop-database -q /usr/share/applications || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q /usr/share/icons/hicolor || true
SH
cp "$pkg/DEBIAN/postinst" "$pkg/DEBIAN/postrm"
chmod 755 "$pkg/DEBIAN/postinst" "$pkg/DEBIAN/postrm"
dpkg-deb --root-owner-group --build "$pkg" "$OUT/holdem_${VERSION}_amd64.deb" >/dev/null
rm -rf "$pkg"

ls -lh "$OUT"
