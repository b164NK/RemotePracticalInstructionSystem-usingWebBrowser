# RemotePracticalInstructionSystem-usingWebBrowser


[Human scale capturing system]()  
・・・姿勢推定による人型抽出システムに関するファイル

[Virtual human model co-editing system]()  
・・・仮想人型モデルに対する非同期更新システムに関するファイル 

## 環境構築

上記２つのシステムファイルに加え、サーバーとしてFirebaseを用いて環境構築を行う。
ここでは、「FirebaseHosting」というサービスによってWEBアプリケーションとして公開するまでの手順を述べる。


### 1. Firebaseプロジェクトを作る（要：自身のGoogleアカウント）  

### 2. 「プロダクトのカテゴリ」から「FirebaseHosting」を選び、画面に従って進める  
    - FirebaseCLIを自身のPCにインストール
    - WEBアプリのルートディレクトリは自身のPC内に任意に設定
    - コマンド「firebase init」で作られたルートディレクトリ内のフォルダ「public」に、２つのうち片方ののシステムファイルを置く
    - フォルダ「public」に既に、index.htmlが置かれている場合は消しておく

### 3. 「プロダクトのカテゴリ」から「FirebaseRealtimeDatabase」を選び、画面に従って進める
    - データベースはJSON形式である
    - カラム構成の雛形となるJSONファイル「Pan-Obj-Mot.json」をインポートする

### 4.

### 5.



## 操作方法

ここでは、
