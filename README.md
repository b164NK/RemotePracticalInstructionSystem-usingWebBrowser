# RemotePracticalInstructionSystem-usingWebBrowser


[Human scale capturing system](https://github.com/b164NK/RemotePracticalInstructionSystem-usingWebBrowser/tree/master/Human%20scale%20capturing%20system)  
・・・姿勢推定による人型抽出システムに関するファイル

[Virtual human model co-editing system](https://github.com/b164NK/RemotePracticalInstructionSystem-usingWebBrowser/tree/master/Virtual%20human%20model%20co-editing%20system)  
・・・仮想人型モデルに対する非同期更新システムに関するファイル 

## 環境構築

上記２つのシステムファイルに加え、サーバーとしてFirebaseを用いて環境構築を行う。
ここでは、「FirebaseHosting」というサービスによってWEBアプリケーションとして公開するまでの手順を述べる。


### 1. Firebaseプロジェクトを作る（要：自身のGoogleアカウント）  

### 2. プロジェクトのホーム画面左側の「プロダクトのカテゴリ」から「FirebaseHosting」を選び、画面に従って進める  
    - FirebaseCLIを自身のPCにインストール(初回のみ)
    - WEBアプリのルートディレクトリは自身のPC内に任意に設定
    - コマンド「firebase init」で作られたルートディレクトリ内のフォルダ「public」に、２つのうち片方ののシステムファイルを置く
    - フォルダ「public」に既に、index.htmlが置かれている場合は消しておく

### 3. 同じく「プロダクトのカテゴリ」から「FirebaseRealtimeDatabase」を選び、画面に従って進める
    - データベースはJSON形式である
    - カラム構成の雛形となるJSONファイル「Pan-Obj-Mot.json」をインポートする

### 4. 2で使わなかった方のシステムファイルを用いて、1~3の手順を再度行う


## 操作方法

ここでは、WEBアプリケーションを実際に用いた、ユーザ操作の手順について述べる。

## 備考

２つのプロジェクトを用いずに１つのプロジェクト内に2つのWEBシステムを構築する方法もある。（参考サイト/[Qiita:Firebase Hostingで複数サイト管理設定](https://qiita.com/zaburo/items/f0fc863d1eb24cfe5cca)）
この方法であれば手動でJSONデータをexport&inportせずとも良いので、ひとまず動作が確認できた折には、こちらの方法を試してみるのが良いかと思う。
