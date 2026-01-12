import http.server
import socketserver
import json
import os
import sys

# ポート番号（既存の8080を使います）
import urllib.request
import urllib.parse
import ssl

# ポート番号（既存の8080を使います）
PORT = 8080
DATA_FILE = 'sake_list.json'
IMAGE_DIR = 'image'

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
                self.send_error_response(str(e))

        # 画像URLからのダウンロード処理
        elif self.path == '/api/upload_image_url':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                image_url = data.get('url')
                jan_code = data.get('jan')

                if not image_url or not jan_code:
                    raise ValueError("URLとJANコードは必須です")

                # URLから拡張子を推測（簡易的）
                path = urllib.parse.urlparse(image_url).path
                ext = os.path.splitext(path)[1].lower()
                if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                    ext = '.jpg' # デフォルト

                # 保存先パス
                if not os.path.exists(IMAGE_DIR):
                    os.makedirs(IMAGE_DIR)
                
                save_filename = f"{jan_code}{ext}"
                save_path = os.path.join(IMAGE_DIR, save_filename)
                
                # 403 Forbidden対策でUser-Agentを設定
                req = urllib.request.Request(
                    image_url, 
                    data=None, 
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                )

                # SSL証明書検証を無視するコンテキストを作成 (macOSでのエラー回避)
                ssl_context = ssl._create_unverified_context()

                # ダウンロードと保存
                with urllib.request.urlopen(req, context=ssl_context) as response:
                    image_data = response.read()
                    with open(save_path, 'wb') as f:
                        f.write(image_data)
                
                # 他の拡張子の同名ファイルがあれば削除（競合回避のため）
                for e in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                    if e == ext: continue
                    other_path = os.path.join(IMAGE_DIR, f"{jan_code}{e}")
                    if os.path.exists(other_path):
                        os.remove(other_path)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success', 'message': '画像を保存しました', 'filename': save_filename}).encode('utf-8'))

            except Exception as e:
                print(f"Error downloading image: {e}")
                self.send_error_response(str(e))

        else:
            self.send_error(404)

    def send_error_response(self, message):
        self.send_response(500)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'error', 'message': message}).encode('utf-8'))


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
