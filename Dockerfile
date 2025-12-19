# Node.js v22.19.0を使用
FROM node:22.19.0

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# nodemonをグローバルインストール
RUN npm install -g nodemon

# 必要なディレクトリを作成
RUN mkdir -p uploads data public

# アプリケーションのファイルをコピー
COPY . .

# ポートを公開(server.jsではポート8000を使用)
EXPOSE 8000

# アプリケーションを起動
CMD ["node", "server.js"]