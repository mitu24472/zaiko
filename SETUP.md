# 小石川創作展 物品貸出管理システム - セットアップガイド

## 前提条件

- Node.js 18.17.0 以上
- npm または yarn
- Firebase プロジェクト

## インストール手順

### 1. 依存関係のインストール

```bash
# 古いnode_modulesを削除（存在する場合）
rm -rf node_modules package-lock.json

# 依存関係をインストール
npm install
```

### 2. Firebase プロジェクトの設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Firestore Database を有効化
3. プロジェクト設定からFirebase SDK設定を取得

### 3. 環境変数の設定

`.env.example` を `.env.local` にコピーして、Firebase設定を入力：

```bash
cp .env.example .env.local
```

`.env.local` の内容例：
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

### 4. Firestore セキュリティルールの設定

Firebase Console でFirestore セキュリティルールを以下のように設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 管理者コレクション（読み取りのみ許可）
    match /admins/{document} {
      allow read: if true;
      allow write: if false;
    }
    
    // その他のコレクション（読み書き許可）
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 5. 初期データの投入

#### 管理者アカウントの作成

Firebase Console の Firestore で `admins` コレクションを作成し、以下のドキュメントを追加：

```javascript
// ドキュメントID: admin1 (任意)
{
  name: "admin",
  passwordHash: "sha256ハッシュ値"
}
```

パスワードハッシュの生成方法：
```javascript
// ブラウザの開発者ツールコンソールで実行
const password = "your_password";
const salt = "koishikawa_sosakuten_2025";

// crypto-jsライブラリを使用
const hash = CryptoJS.SHA256(password + salt).toString();
console.log(hash);
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

## 使用方法

### 管理者ログイン
1. http://localhost:3000/admin/login にアクセス
2. 設定したユーザー名とパスワードでログイン

### 生徒向け在庫確認
1. http://localhost:3000/items にアクセス（ログイン不要）

## トラブルシューティング

### Node.jsバージョンエラー
```
You are using Node.js x.x.x. For Next.js, Node.js version >= v18.17.0 is required.
```

→ Node.js 18.17.0 以上にアップデートしてください

### Firebase接続エラー
- `.env.local` ファイルの設定を確認
- Firebase プロジェクトが有効化されているか確認
- Firestore セキュリティルールが正しく設定されているか確認

### ビルドエラー
```bash
# キャッシュをクリア
rm -rf .next
npm run build
```

## デプロイ

### Render でのデプロイ
1. GitHub リポジトリを作成・プッシュ
2. Render でWebサービスを作成
3. 環境変数を設定
4. ビルド・デプロイ実行

### Vercel でのデプロイ
```bash
npm install -g vercel
vercel
```

## サポート

問題が発生した場合は、以下を確認してください：
1. Node.js バージョン
2. Firebase 設定
3. 環境変数
4. Firestore セキュリティルール
