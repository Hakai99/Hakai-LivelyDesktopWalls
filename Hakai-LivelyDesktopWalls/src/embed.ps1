# HAKAI — puts the wallpaper window BEHIND the desktop icons (like Wallpaper Engine / Lively),
# so it never covers the taskbar, the tray "^" menu, or other windows.
param([Int64]$Hwnd, [int]$X, [int]$Y, [int]$W, [int]$H, [string]$Mode = 'workerw')
$ErrorActionPreference = 'Stop'
try {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class HakaiDesk {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string title);
  [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeout, out IntPtr result);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] static extern IntPtr SetParent(IntPtr child, IntPtr parent);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] static extern int GetSystemMetrics(int i);
  [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h, uint flags);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr h, int i);
  [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr h, int i, IntPtr v);

  static string Hex(IntPtr p) { return "0x" + p.ToInt64().ToString("X"); }

  public static string Embed(long hwnd, int x, int y, int w, int h, string mode) {
    SetProcessDPIAware();
    IntPtr win = new IntPtr(hwnd);
    if (mode == "detach") {
      long st = GetWindowLongPtr(win, -16).ToInt64();
      st = (st & ~0x40000000L) | 0x80000000L;                       // - WS_CHILD, + WS_POPUP
      SetWindowLongPtr(win, -16, new IntPtr(st));
      SetParent(win, IntPtr.Zero);
      SetWindowPos(win, IntPtr.Zero, x, y, w, h - 1, 0x0004 | 0x0010 | 0x0020 | 0x0040);
      return "OK detach";
    }
    IntPtr progman = FindWindow("Progman", null);
    if (progman == IntPtr.Zero) return "FAIL no-progman";
    IntPtr res;
    SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out res);
    SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), IntPtr.Zero, 0, 1000, out res);   // newer Windows 11 builds
    SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(1), 0, 1000, out res);
    IntPtr workerw = IntPtr.Zero;
    EnumWindows(delegate(IntPtr top, IntPtr l) {
      if (FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero)
        workerw = FindWindowEx(IntPtr.Zero, top, "WorkerW", null);
      return true;
    }, IntPtr.Zero);
    string workerwKind = "classic";
    if (workerw == IntPtr.Zero) { workerw = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null); workerwKind = "child-of-progman"; }
    IntPtr defView = FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);

    IntPtr parent = workerw;
    IntPtr after = IntPtr.Zero;
    if (mode == "progman") {
      parent = progman;
      after = defView != IntPtr.Zero ? defView : new IntPtr(1);   // just under the icons, above the wallpaper layer
    }
    if (parent == IntPtr.Zero) return "FAIL no-parent progman=" + Hex(progman) + " workerw=" + Hex(workerw);

    // Make it a real child window (Windows requires this for SetParent on a popup window)
    long style = GetWindowLongPtr(win, -16).ToInt64();
    style = (style & ~0x80000000L) | 0x40000000L | 0x02000000L;      // - WS_POPUP, + WS_CHILD, + WS_CLIPSIBLINGS
    SetWindowLongPtr(win, -16, new IntPtr(style));
    SetParent(win, parent);

    int vx = GetSystemMetrics(76), vy = GetSystemMetrics(77);
    uint flags = 0x0010 | 0x0020 | 0x0040;                          // NOACTIVATE | FRAMECHANGED | SHOWWINDOW
    if (after == IntPtr.Zero) flags |= 0x0004;                      // NOZORDER
    SetWindowPos(win, after, x - vx, y - vy, w, h, flags);

    bool parentOk = GetAncestor(win, 1) == parent;                  // 1 = GA_PARENT
    RECT r; GetWindowRect(win, out r);
    return (parentOk ? "OK" : "FAIL") + " mode=" + mode + " parentOk=" + parentOk +
           " visible=" + IsWindowVisible(win) + " workerw=" + workerwKind +
           " progman=" + Hex(progman) + " defView=" + Hex(defView) + " parent=" + Hex(parent) +
           " rect=" + r.L + "," + r.T + "," + r.R + "," + r.B;
  }
}
'@
Write-Output ([HakaiDesk]::Embed($Hwnd, $X, $Y, $W, $H, $Mode))
} catch { Write-Output ("FAIL error: " + $_.Exception.Message) }
