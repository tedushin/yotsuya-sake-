import http.server
import socketserver
import json
import os
import sys

# ポート番号（既存の8080を使います）
PORT = 8080
DATA_FILE = 'sake_list.json'

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        # データの保存処理
        if self.path == '/api/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # JSONデータを受け取る
                new_data = json.loads(post_data)
                
                # ファイルに書き込む（バックアップを一応とるのが安全ですが今回は直接上書き）
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(new_data, f, indent=2, ensure_ascii=False)
                
                # 成功レスポンス
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success', 'message': '保存しました'}).encode('utf-8'))
                
            except Exception as e:
                print(f"Error saving data: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
        else:
            self.send_error(404)

    # キャッシュ無効化（開発中のため）
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

print(f"Starting server at http://localhost:{PORT}")
print(f"Admin page: http://localhost:{PORT}/admin.html")

# 既存のポートが使われている場合のエラーハンドリングは省略（再起動前提）
try:
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        httpd.serve_forever()
except OSError as e:
    print(f"Error: Port {PORT} is already in use. Please stop the existing server first.")
    sys.exit(1)
