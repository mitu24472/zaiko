# 小石川創作展 物品貸出管理システム

小石川中等教育学校の創作展における物品貸出管理システムです。

## 機能概要

### 統合トップページ
- **在庫確認機能統合**: トップページで直接在庫状況を確認可能
- **リアルタイム更新**: 「在庫を更新」ボタンで最新情報を取得
- **管理者ログインアクセス**: トップページから管理者ログインへ直接アクセス

### 管理者機能（認証必須）
- クラス管理（追加・編集・削除・検索・ソート）
- アイテム種別管理（追加・編集・削除）
- アイテム管理（在庫追加・貸出・返却・削除・高度な検索・フィルタ・ソート）
- 貸出/返却状況の一覧表示

#### 🆕 新機能: 高度な検索・フィルタ・ソート
- **在庫管理画面**:
  - 識別番号・アイテム名での検索
  - アイテム種別でのフィルタ
  - ステータス（利用可能/貸出中）でのフィルタ
  - 借用クラスでのフィルタ
  - 全列でのソート機能（クリックで昇順/降順切り替え）
  
- **クラス管理画面**:
  - クラス名での検索
  - 名前順でのソート（昇順/降順）

### 生徒向け機能（認証不要）
- **統合トップページ**: アイテム別の利用可能数確認（ログイン不要）
- **リアルタイム更新**: 手動更新ボタンで最新の在庫状況を取得

## 技術スタック

- **フロントエンド**: Next.js 13.5.6 + React + TypeScript + Tailwind CSS
- **バックエンド**: Firebase Firestore
- **認証**: 独自認証システム（SHA256 + 固定salt）
- **デプロイ**: Render対応

## UI/UX改善

### 管理者ログイン画面
- **トップページ戻りボタン**: ログイン画面からトップページに簡単に戻れる

### 在庫管理画面
- **フィルタパネル**: 直感的な検索・フィルタインターフェース
- **ソート可能なテーブル**: 列ヘッダークリックでソート
- **リアルタイム件数表示**: フィルタ結果の件数を表示
- **ワンクリッククリア**: 全フィルタを一括クリア

### クラス管理画面  
- **検索機能**: クラス名の部分一致検索
- **ソート機能**: クラス名でのソート
- **件数表示**: 検索結果の件数表示

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebase設定

`.env.local` ファイルを作成し、Firebase設定を追加：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firestoreコレクション構造

#### admins
```
{
  name: string,
  passwordHash: string  // sha256(password + salt)
}
```

#### classes
```
{
  name: string  // 例: "1年A組"
}
```

#### items
```
{
  label: string  // 例: "プロジェクター"
}
```

#### instances
```
{
  id: string,           // 識別番号（ドキュメントID）
  itemId: string,       // itemsコレクションへの参照
  isAvailable: boolean,
  borrowedBy: string | null,  // classesコレクションへの参照
  borrowedAt: Timestamp | null
}
```

### 4. 初期管理者データの追加

Firebaseコンソールで `admins` コレクションに管理者を追加：

```javascript
// パスワードハッシュの生成例（ブラウザコンソールで実行）
const password = "your_password";
const salt = "koishikawa_sosakuten_2025";
const hash = CryptoJS.SHA256(password + salt).toString();
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

## 使用方法

### 生徒・一般利用者
1. トップページ（`/`）で在庫状況を直接確認
2. 「在庫を更新」ボタンで最新情報を取得

### 管理者
1. トップページから「管理者ログイン」をクリック
2. ログイン後、ダッシュボードから各機能にアクセス
3. 高度な検索・フィルタ・ソート機能を活用して効率的に管理

#### 在庫管理の便利な使い方
- 特定のアイテム種別のみを表示: アイテム種別プルダウンで選択
- 貸出中のもののみ表示: ステータスで「貸出中」を選択
- 特定のクラスが借りているもの: 借用クラスプルダウンで選択
- 識別番号で検索: 検索ボックスに識別番号を入力
- 貸出日時順で並び替え: 貸出日時列ヘッダーをクリック

## デプロイ

### Renderへのデプロイ
1. GitHub リポジトリを Render に接続
2. **環境変数を設定**：
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   PORT=10000
   ```
3. **ビルド設定**：
   - Node.js バージョン: 18.17.0 (`.nvmrc`で指定)
   - ビルドコマンド: `npm ci && npm run build`
   - 開始コマンド: `npm run start`

### デプロイ時の注意事項
- Node.js 18.17.0を使用
- Next.js 13.5.6は安定版でデプロイエラーを回避
- `moduleResolution: "node"`でTypeScriptエラーを解決
- App Router対応でミドルウェアとエラーハンドリングを実装
- 環境変数`PORT`の設定が必要（通常は10000）

## セキュリティ

- パスワードは SHA256 + 固定salt でハッシュ化
- セッション管理は sessionStorage を使用
- 管理者機能は認証チェック必須

## ライセンス

このプロジェクトは小石川中等教育学校の創作展専用です。
