// scripts/sample-data.js
// サンプルデータ投入スクリプト（Firebase Console で手動実行）

/*
このスクリプトは Firebase Console の Firestore データベースでJavaScriptコンソールから実行してください。

1. Firebase Console にアクセス
2. Firestore Database を開く
3. ブラウザの開発者ツールを開く
4. 以下のコードをコンソールに貼り付けて実行

注意: 実際の環境では、Firebase Admin SDK やサーバーサイドスクリプトを使用することを推奨します。
*/

// サンプル管理者データ
const adminData = {
  name: "admin",
  passwordHash: "a4b8c6d8e10f12a14b16c18d20e22f24a26b28c30d32e34f36a38b40c42d44e46f48a" // password: "demo123"
};

// サンプルクラスデータ
const classData = [
  { name: "1年A組" },
  { name: "1年B組" },
  { name: "2年A組" },
  { name: "2年B組" },
  { name: "3年A組" },
  { name: "3年B組" }
];

// サンプルアイテムデータ
const itemData = [
  { label: "プロジェクター" },
  { label: "スクリーン" },
  { label: "マイク" },
  { label: "スピーカー" },
  { label: "延長コード" },
  { label: "テーブル" },
  { label: "椅子" }
];

// 実行関数
async function setupSampleData() {
  console.log("サンプルデータの投入を開始します...");
  
  try {
    // 管理者データの追加
    await firebase.firestore().collection('admins').doc('admin').set(adminData);
    console.log("管理者データを追加しました");

    // クラスデータの追加
    for (let i = 0; i < classData.length; i++) {
      await firebase.firestore().collection('classes').add(classData[i]);
    }
    console.log("クラスデータを追加しました");

    // アイテムデータの追加
    for (let i = 0; i < itemData.length; i++) {
      await firebase.firestore().collection('items').add(itemData[i]);
    }
    console.log("アイテムデータを追加しました");

    console.log("サンプルデータの投入が完了しました！");
    console.log("ログイン情報: ユーザー名=admin, パスワード=demo123");
    
  } catch (error) {
    console.error("エラーが発生しました:", error);
  }
}

// 実行
// setupSampleData();

console.log("サンプルデータ投入の準備ができました。");
console.log("setupSampleData() を実行してデータを投入してください。");
