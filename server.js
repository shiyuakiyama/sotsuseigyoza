// ============================================
// 1. パッケージのインポート
// ============================================
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// ============================================
// 2. Expressアプリケーションの初期化
// ============================================
const app = express();
const PORT = 8000;

// ============================================
// 3. ミドルウェアの設定（appを定義した後）
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'))

// ============================================
// 5. 設定ファイル管理
// ============================================
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

function loadConfig() {
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        console.log('✅ config.json を読み込みました');
        return config;
    } catch (error) {
        console.error('❌ config.json 読み込みエラー:', error.message);
        return null;
    }
}

function saveConfig(config) {
    try {
        if (!config) {
            console.error('❌ saveConfig: configがundefinedです');
            return false;
        }
        
        const jsonString = JSON.stringify(config, null, 2);
        fs.writeFileSync(CONFIG_FILE, jsonString, 'utf8');
        console.log('✅ config.json を更新しました');
        return true;
    } catch (error) {
        console.error('❌ config.json 保存エラー:', error.message);
        return false;
    }
}

// config.jsonがなければ初期データ作成
if (!fs.existsSync(CONFIG_FILE)) {
    console.log('⚠️ config.json が存在しないため、初期データを作成します');
    const defaultConfig = {
        appTitle: "うつのみYEAH!",
        subtitle1: "帰り道は宇都宮で。",
        subtitle2: "寄り道が、特別な旅になる。",
        map: {
            center: { lat: 36.5579, lng: 139.8984 },
            zoom: 14
        },
        categories: [
            { id: 'gyoza', name: '餃子', emoji: '🥟' },
            { id: 'cocktail', name: 'カクテル', emoji: '🍸' },
            { id: 'jazz', name: 'ジャズ', emoji: '🎷' }
        ],
        ai: {
            greeting: 'こんにちは!宇都宮観光AI案内です 🎉',
            description: '短時間で宇都宮を楽しむ最適なルートをご提案します!',
            categoryPrompt: '何を体験したいですか?'
        }
    };
    
    if (saveConfig(defaultConfig)) {
        console.log('✅ config.json を作成しました');
    } else {
        console.error('❌ config.json の作成に失敗しました');
    }
}

// ============================================
// API: 設定取得
// ============================================
app.get('/api/config', (req, res) => {
    console.log('📥 GET /api/config - 設定取得リクエスト');
    const config = loadConfig();
    
    if (config) {
        console.log('✅ 設定を返却:', config.appTitle);
        res.json(config);
    } else {
        console.error('❌ 設定の読み込みに失敗');
        res.status(500).json({ error: '設定ファイルの読み込みに失敗しました' });
    }
});

// ============================================
// API: 設定更新
// ============================================
app.post('/api/config', (req, res) => {
    console.log('📤 POST /api/config - 設定更新リクエスト');
    console.log('受信データ:', JSON.stringify(req.body, null, 2));
    
    const newConfig = req.body;
    
    // リクエストボディのチェック
    if (!newConfig || Object.keys(newConfig).length === 0) {
        console.error('❌ リクエストボディが空です');
        return res.status(400).json({ error: 'リクエストボディが空です' });
    }
    
    // 必須フィールドのチェック
    if (!newConfig.appTitle || !newConfig.map || !newConfig.categories || !newConfig.ai) {
        console.error('❌ 必須フィールドが不足しています');
        return res.status(400).json({ error: '必須フィールドが不足しています' });
    }
    
    // 保存実行
    if (saveConfig(newConfig)) {
        console.log('✅ 設定を保存しました:', newConfig.appTitle);
        res.json({ message: '設定を保存しました', config: newConfig });
    } else {
        console.error('❌ 設定の保存に失敗');
        res.status(500).json({ error: '設定の保存に失敗しました' });
    }
});

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

// Twitter API クライアント初期化
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const roClient = twitterClient.readOnly;

// ============================================
// 6. places.json管理
// ============================================
const PLACES_FILE = path.join(__dirname, 'data', 'places.json');

function loadPlacesData() {
    try {
        const data = fs.readFileSync(PLACES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('places.json 読み込みエラー:', error);
        return [];
    }
}

function savePlacesData(placesData) {
    try {
        fs.writeFileSync(PLACES_FILE, JSON.stringify(placesData, null, 2), 'utf8');
        console.log('✅ places.json を更新しました');
        return true;
    } catch (error) {
        console.error('❌ places.json 保存エラー:', error);
        return false;
    }
}

if (!fs.existsSync(PLACES_FILE)) {
    savePlacesData([]);
    console.log('✅ places.json を作成しました(空配列)');
}

// ============================================
// 4. フォルダの作成チェック
// ============================================
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
    console.log('✅ data/ フォルダを作成しました');
}

// places.jsonがなければ初期データ作成
if (!fs.existsSync(PLACES_FILE)) {
    savePlacesData([]);
    console.log('✅ places.json を作成しました（空配列）');
}

// ============================================
// 7. 画像アップロード設定
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('画像ファイルのみアップロード可能です'));
        }
    }
});

// ============================================
// データベース初期化（口コミ用のみ）
// ============================================
const db = new sqlite3.Database('./reviews.db', (err) => {
    if (err) {
        console.error('データベース接続エラー:', err);
    } else {
        console.log('✅ reviews.db に接続しました');
        initDatabase();
    }
});

function initDatabase() {
    // 口コミテーブル
    db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            place_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
            image_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            helpful_count INTEGER DEFAULT 0
        )
    `);

    // 参考になった投票テーブル
    db.run(`
        CREATE TABLE IF NOT EXISTS helpful_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review_id INTEGER NOT NULL,
            user_ip TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (review_id) REFERENCES reviews(id),
            UNIQUE(review_id, user_ip)
        )
    `);

    console.log('✅ 口コミ用テーブルを初期化しました');
}

function migrateDatabase() {
    db.all("PRAGMA table_info(reviews)", [], (err, columns) => {
        if (err) {
            console.error(err);
            return;
        }
        
        const hasPlaceId = columns.some(col => col.name === 'place_id');
        
        if (!hasPlaceId) {
            console.log('⚠️ place_id カラムが存在しません。マイグレーションを実行します...');
            
            db.run(`ALTER TABLE reviews ADD COLUMN place_id TEXT`, (err) => {
                if (err) {
                    console.error('マイグレーションエラー:', err);
                } else {
                    console.log('✅ place_id カラムを追加しました');
                }
            });
        }
    });
}

// ============================================
// 距離計算関数
// ============================================
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球の半径(km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
             Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ============================================
// 10. ルーティング（ページ配信）
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/realtime-update', (req, res) => {
    res.sendFile(path.join(__dirname, 'realtime-update.html'));
});

// ============================================
// API: 店舗一覧取得（places.jsonから）
// ============================================
app.get('/api/places', (req, res) => {
    try {
        const { category, lat, lng } = req.query;
        
        // JSONファイルから店舗データを読み込み
        let places = loadPlacesData();
        
        // カテゴリフィルター
        if (category && category !== 'all') {
            places = places.filter(place => place.category === category);
        }
        
        // 現在地からの距離計算
        if (lat && lng) {
            places = places.map(place => {
                const distance = calculateDistance(
                    parseFloat(lat), parseFloat(lng),
                    place.lat, place.lng
                );
                return {
                    ...place,
                    distance: distance < 1 ? 
                        Math.round(distance * 1000) + 'm' : 
                        distance.toFixed(1) + 'km',
                    walk_time: Math.ceil(distance * 12) + '分'
                };
            });
        }
        
        res.json(places);
    } catch (error) {
        console.error('店舗データ取得エラー:', error);
        res.status(500).json({ error: 'データ取得エラー' });
    }
});

// ============================================
// API: 店舗詳細取得
// ============================================
app.get('/api/places/:id', (req, res) => {
    try {
        const { id } = req.params;
        const places = loadPlacesData();
        const place = places.find(p => p.id === id);
        
        if (!place) {
            return res.status(404).json({ error: '店舗が見つかりません' });
        }
        
        // この店舗の口コミのみを取得
        db.all(
            `SELECT * FROM reviews 
             WHERE place_id = ?
             ORDER BY created_at DESC 
             LIMIT 3`,
            [id],
            (err, reviews) => {
                if (err) {
                    console.error(err);
                }
                res.json({
                    ...place,
                    recent_reviews: reviews || []
                });
            }
        );
    } catch (error) {
        console.error('店舗詳細取得エラー:', error);
        res.status(500).json({ error: 'データ取得エラー' });
    }
});

// ============================================
// API: 新しい店舗を追加
// ============================================
app.post('/api/places', (req, res) => {
    console.log('📥 店舗追加リクエスト受信:', req.body); // ← デバッグ用
    
    try {
        const newPlace = req.body;
        
        // バリデーション
        if (!newPlace.id || !newPlace.name || !newPlace.category || !newPlace.lat || !newPlace.lng) {
            console.error('❌ 必須項目不足');
            return res.status(400).json({ 
                error: '必須項目: id, name, category, lat, lng' 
            });
        }
        
        // 既存データ読み込み
        const places = loadPlacesData();
        
        // ID重複チェック
        if (places.find(p => p.id === newPlace.id)) {
            console.error('❌ ID重複:', newPlace.id);
            return res.status(400).json({ 
                error: `ID "${newPlace.id}" は既に存在します` 
            });
        }
        
        // デフォルト値設定
        const placeWithDefaults = {
            status: 'available',
            rating: 0,
            review_count: 0,
            price_range: '',
            specialty: '',
            stay_time: '',
            menu_photo: '',
            realtime_info: '',
            description: '',
            google_maps_url: `https://maps.google.com/?q=${newPlace.lat},${newPlace.lng}`,
            popular_menus: [],
            ...newPlace
        };
        
        // 配列に追加
        places.push(placeWithDefaults);
        
        // JSONファイルに保存
        if (savePlacesData(places)) {
            console.log('✅ 店舗追加成功:', placeWithDefaults.name);
            res.json({ 
                message: '店舗を追加しました',
                place: placeWithDefaults
            });
        } else {
            console.error('❌ 保存エラー');
            res.status(500).json({ error: '保存エラー' });
        }
    } catch (error) {
        console.error('❌ 店舗追加エラー:', error);
        res.status(500).json({ error: '追加エラー: ' + error.message });
    }
});

// ============================================
// API: 店舗を更新
// ============================================
app.put('/api/places/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        let places = loadPlacesData();
        const index = places.findIndex(p => p.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: '店舗が見つかりません' });
        }
        
        // 更新
        places[index] = {
            ...places[index],
            ...updates,
            id: id // IDは変更不可
        };
        
        // 保存
        if (savePlacesData(places)) {
            res.json({ 
                message: '店舗を更新しました',
                place: places[index]
            });
        } else {
            res.status(500).json({ error: '保存エラー' });
        }
    } catch (error) {
        console.error('店舗更新エラー:', error);
        res.status(500).json({ error: '更新エラー' });
    }
});

// ============================================
// API: 店舗を削除
// ============================================
app.delete('/api/places/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        let places = loadPlacesData();
        const filteredPlaces = places.filter(p => p.id !== id);
        
        if (places.length === filteredPlaces.length) {
            return res.status(404).json({ error: '店舗が見つかりません' });
        }
        
        // 保存
        if (savePlacesData(filteredPlaces)) {
            res.json({ message: '店舗を削除しました' });
        } else {
            res.status(500).json({ error: '保存エラー' });
        }
    } catch (error) {
        console.error('店舗削除エラー:', error);
        res.status(500).json({ error: '削除エラー' });
    }
});

// ============================================
// API: 口コミ一覧取得
// ============================================
app.get('/api/reviews', (req, res) => {
    const { place_id } = req.query;
    
    let query = `
        SELECT id, place_id, author_name, content, rating, image_path, 
               datetime(created_at, 'localtime') as created_at, 
               helpful_count 
        FROM reviews
    `;
    
    const params = [];
    
    // 店舗IDでフィルタリング
    if (place_id) {
        query += ` WHERE place_id = ?`;
        params.push(place_id);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'データ取得エラー' });
        } else {
            res.json(rows);
        }
    });
});

// ============================================
// API: 口コミ投稿
// ============================================
app.post('/api/reviews', upload.single('image'), (req, res) => {
    console.log('📥 受信データ:', req.body); // デバッグ用
    
    const { author_name, content, rating, place_id } = req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;

    // より詳細なバリデーション
    if (!author_name) {
        return res.status(400).json({ error: '名前を入力してください' });
    }
    
    if (!content) {
        return res.status(400).json({ error: '口コミ内容を入力してください' });
    }
    
    if (!rating) {
        return res.status(400).json({ error: '評価を選択してください' });
    }
    
    if (!place_id) {
        console.error('❌ place_id が送信されていません');
        return res.status(400).json({ error: '店舗IDが取得できませんでした' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: '評価は1〜5の範囲で入力してください' });
    }

    console.log('✅ バリデーション通過:', { place_id, author_name, rating });

    const query = `
        INSERT INTO reviews (place_id, author_name, content, rating, image_path) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [place_id, author_name, content, rating, image_path], function(err) {
        if (err) {
            console.error('❌ DB挿入エラー:', err);
            res.status(500).json({ error: '投稿エラー' });
        } else {
            console.log('✅ 口コミ投稿成功 ID:', this.lastID);
            res.json({ 
                message: '口コミを投稿しました',
                id: this.lastID 
            });
        }
    });
});

// ============================================
// API: 参考になったボタン
// ============================================
app.post('/api/reviews/:id/helpful', (req, res) => {
    const reviewId = req.params.id;
    const userIp = req.ip || req.connection.remoteAddress;

    db.get(
        'SELECT id FROM helpful_votes WHERE review_id = ? AND user_ip = ?',
        [reviewId, userIp],
        (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'エラーが発生しました' });
            }

            if (row) {
                return res.status(400).json({ error: '既に投票済みです' });
            }

            db.run(
                'INSERT INTO helpful_votes (review_id, user_ip) VALUES (?, ?)',
                [reviewId, userIp],
                function(err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: '投票エラー' });
                    }

                    db.run(
                        'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?',
                        [reviewId],
                        (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({ error: '更新エラー' });
                            }

                            res.json({ message: '参考になったを追加しました' });
                        }
                    );
                }
            );
        }
    );
});

// ============================================
// API: 口コミ削除
// ============================================
app.delete('/api/reviews/:id', (req, res) => {
    const reviewId = req.params.id;
    const { author_name, admin_password } = req.body;
    
    const ADMIN_PASSWORD = 'admin2024';
    
    db.get('SELECT * FROM reviews WHERE id = ?', [reviewId], (err, review) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'データ取得エラー' });
        }
        
        if (!review) {
            return res.status(404).json({ error: '口コミが見つかりません' });
        }
        
        const isAdmin = admin_password === ADMIN_PASSWORD;
        const isAuthor = author_name === review.author_name;
        
        if (!isAdmin && !isAuthor) {
            return res.status(403).json({ error: '削除権限がありません' });
        }
        
        if (review.image_path) {
            const imagePath = '.' + review.image_path;
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('画像削除エラー:', err);
                }
            });
        }
        
        db.run('DELETE FROM reviews WHERE id = ?', [reviewId], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: '削除エラー' });
            }
            
            db.run('DELETE FROM helpful_votes WHERE review_id = ?', [reviewId], (err) => {
                if (err) {
                    console.error('投票削除エラー:', err);
                }
            });
            
            res.json({ message: '口コミを削除しました' });
        });
    });
});

// ============================================
// 🔄 強化版リアルタイム情報更新API
// ============================================

app.post('/api/store/realtime-update', (req, res) => {
    const { 
        store_id, 
        status, 
        wait_time, 
        crowd_level, 
        special_info, 
        open_time, 
        close_time,
        twitter_account,
        instagram_account
    } = req.body;
    
    if (!store_id) {
        return res.status(400).json({ error: 'store_id is required' });
    }
    
    try {
        let places = loadPlacesData();
        const index = places.findIndex(p => p.id === store_id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Store not found' });
        }
        
        // リアルタイム情報を構築
        const realtimeInfo = `現在の混雑度: ${crowd_level}% | 待ち時間: ${wait_time}分 | ${special_info}`;
        
        // 店舗情報を更新
        places[index] = {
            ...places[index],
            status: status,
            realtime_info: realtimeInfo,
            last_updated: new Date().toISOString(),
            today_hours: `${open_time}〜${close_time}`,
            // SNS情報を追加
            twitter_account: twitter_account || places[index].twitter_account || '',
            instagram_account: instagram_account || places[index].instagram_account || ''
        };
        
        // 保存
        if (savePlacesData(places)) {
            console.log(`✅ ${places[index].name} のリアルタイム情報を更新しました`);
            
            // SNS情報も更新された場合はログに記録
            if (twitter_account || instagram_account) {
                console.log(`📱 SNS連携: Twitter=${twitter_account || 'なし'}, Instagram=${instagram_account || 'なし'}`);
            }
            
            res.json({ 
                message: '更新成功',
                store: places[index]
            });
        } else {
            res.status(500).json({ error: '保存エラー' });
        }
    } catch (error) {
        console.error('リアルタイム更新エラー:', error);
        res.status(500).json({ error: '更新エラー' });
    }
});

// ============================================
// 📱 SNS投稿取得API（Twitter）
// ============================================

async function fetchTwitterPosts(username) {
    try {
        // @を除去
        const cleanUsername = username.replace('@', '');
        
        // ユーザーIDを取得
        const user = await roClient.v2.userByUsername(cleanUsername);
        
        if (!user.data) {
            console.log(`Twitter user @${cleanUsername} not found`);
            return [];
        }
        
        // ユーザーの最新ツイートを取得（最大2件）
        const tweets = await roClient.v2.userTimeline(user.data.id, {
            max_results: 5,
            'tweet.fields': ['created_at', 'public_metrics'],
            exclude: ['retweets', 'replies'] // リツイートとリプライを除外
        });
        
        // データ整形
        const formattedTweets = tweets.data.data
            .slice(0, 2)  // 最新2件に制限
            .map(tweet => ({
                id: tweet.id,
                author: `@${cleanUsername}`,
                text: tweet.text,
                created_at: tweet.created_at,
                likes: tweet.public_metrics.like_count,
                retweets: tweet.public_metrics.retweet_count
            }));
            
        console.log(`✅ @${cleanUsername} のツイート ${formattedTweets.length}件取得`);
        return formattedTweets;
        
    } catch (error) {
        console.error(`❌ Twitter API Error for @${username}:`, error.message);
        // エラー時は空配列を返す（アプリは動作し続ける）
        return [];
    }
}

// Instagram APIからリアルタイムで取得する関数（実装例）
async function fetchInstagramPosts(username) {
    // 実際の実装ではInstagram Graph APIを使用
    
    const demoPosts = [
        {
            id: 'ig_1',
            username: username,
            caption: '📸 本日の一押し！特製餃子プレート✨ #宇都宮餃子 #グルメ',
            media_url: '/images/demo_gyoza.jpg',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            likes: 234
        },
        {
            id: 'ig_2',
            username: username,
            caption: '🎉 おかげさまで創業60周年！感謝の気持ちを込めて特別メニューをご用意しました',
            media_url: '/images/demo_celebration.jpg',
            timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            likes: 512
        }
    ];
    
    return demoPosts;
}

// 店舗のSNS投稿を取得
app.get('/api/store/:store_id/social-posts', async (req, res) => {
    const { store_id } = req.params;
    
    try {
        const places = loadPlacesData();
        const store = places.find(p => p.id === store_id);
        
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }
        
        const socialPosts = {
            twitter: [],
            instagram: []
        };
        
        // Twitterアカウントが登録されている場合
        if (store.twitter_account) {
            socialPosts.twitter = await fetchTwitterPosts(store.twitter_account);
        }
        
        // Instagramアカウントが登録されている場合
        if (store.instagram_account) {
            socialPosts.instagram = await fetchInstagramPosts(store.instagram_account);
        }
        
        res.json({
            store_id,
            store_name: store.name,
            has_twitter: !!store.twitter_account,
            has_instagram: !!store.instagram_account,
            posts: socialPosts
        });
        
    } catch (error) {
        console.error('SNS投稿取得エラー:', error);
        res.status(500).json({ error: 'SNS連携エラー' });
    }
});

// ============================================
// 🔄 自動更新スケジューラー（SNS対応版）
// ============================================

// 30分ごとにSNS投稿をキャッシュ
setInterval(async () => {
    console.log('🔄 SNS投稿の自動更新チェック開始...');
    
    const places = loadPlacesData();
    let updateCount = 0;
    
    for (const place of places) {
        try {
            // Twitterアカウントがある店舗のみ
            if (place.twitter_account) {
                const tweets = await fetchTwitterPosts(place.twitter_account);
                console.log(`📱 ${place.name}: Twitter投稿 ${tweets.length}件取得`);
                updateCount++;
            }
            
            // Instagramアカウントがある店舗のみ
            if (place.instagram_account) {
                const posts = await fetchInstagramPosts(place.instagram_account);
                console.log(`📷 ${place.name}: Instagram投稿 ${posts.length}件取得`);
                updateCount++;
            }
        } catch (error) {
            console.error(`❌ ${place.name} のSNS取得エラー:`, error);
        }
    }
    
    console.log(`✅ SNS自動更新完了: ${updateCount}店舗`);
    
}, 30 * 60 * 1000); // 30分

console.log('✅ SNS連携機能が有効になりました');
console.log('🔄 30分ごとにSNS投稿を自動取得します');

// ============================================
// サーバー起動
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`📁 店舗データ: ${PLACES_FILE}`);
    console.log(`💾 口コミデータ: reviews.db`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err);
        }
        console.log('データベース接続を閉じました');
        process.exit(0);
    });
});