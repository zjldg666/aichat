// AiChat/utils/db.js

const DB_NAME = 'ai_chat_game';
const DB_PATH = '_doc/ai_chat.db';

export const DB = {
    // 1. 打开并初始化数据库
    init() {
        return new Promise((resolve, reject) => {
            // #ifdef APP-PLUS
            if (!plus.sqlite.isOpenDatabase({ name: DB_NAME, path: DB_PATH })) {
                plus.sqlite.openDatabase({
                    name: DB_NAME,
                    path: DB_PATH,
                    success: () => {
                        console.log('📦 SQLite 数据库已连接');
                        // 🔗 链式调用：先建表 -> 再尝试升级(处理旧数据) -> 完成
                        this.createTables()
                            .then(() => this.upgradeTables()) 
                            .then(resolve)
                            .catch(reject);
                    },
                    fail: (e) => reject(e)
                });
            } else {
                resolve();
            }
            // #endif
            // #ifndef APP-PLUS
            console.warn('SQLite 仅支持 App 端，当前环境将退回到 Mock 模式');
            resolve();
            // #endif
        });
    },

    // 2. 创建表结构 (消息表和日记表)
    createTables() {
        const sqls = [
            // 消息表：增加 source_mode 字段 (device=手机, reality=当面)
            `CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chatId TEXT,
                role TEXT,
                content TEXT,
                type TEXT,
                isSystem INTEGER,
                timestamp INTEGER,
                source_mode TEXT  -- ✨ 新增字段
            )`,
            // 日记表 (保持不变)
            `CREATE TABLE IF NOT EXISTS diaries (
                id INTEGER PRIMARY KEY,
                roleId TEXT,
                dateStr TEXT,
                brief TEXT,
                detail TEXT,
                mood TEXT
            )`
        ];
        return Promise.all(sqls.map(sql => this.execute(sql)));
    },

    // 🔥🔥 3. 数据库升级逻辑 (新增方法) 🔥🔥
    upgradeTables() {
        return new Promise((resolve) => {
            // 尝试为旧数据添加 source_mode 字段
            // 如果是新安装的用户，createTables 已经创建了该字段，这里会报错但无影响
            // 如果是旧用户，这里会成功添加字段
            this.execute("ALTER TABLE messages ADD COLUMN source_mode TEXT")
                .then(() => {
                    console.log('🛠️ [DB Upgrade] 成功添加 source_mode 字段');
                    // 可选：将旧数据的 source_mode 默认设为 'device' 或 'reality'，这里暂留空
                    resolve();
                })
                .catch((e) => {
                    // 错误通常意味着字段已存在，忽略即可
                    // console.log('无需升级或字段已存在'); 
                    resolve(); 
                });
        });
    },

    // 执行 SQL (增、删、改)
    execute(sql, values = []) {
        return new Promise((resolve, reject) => {
            plus.sqlite.executeSql({
                name: DB_NAME,
                sql: this.formatSql(sql, values),
                success: (res) => resolve(res),
                fail: (e) => reject(e)
            });
        });
    },

    // 查询 SQL
    select(sql, values = []) {
        return new Promise((resolve, reject) => {
            plus.sqlite.selectSql({
                name: DB_NAME,
                sql: this.formatSql(sql, values),
                success: (res) => resolve(res),
                fail: (e) => reject(e)
            });
        });
    },

    // 简单的 SQL 参数化模拟 (SQLite 插件限制，需要手动处理转义)
    formatSql(sql, values) {
        if (!values.length) return sql;
        let i = 0;
        return sql.replace(/\?/g, () => {
            const val = values[i++];
            // 处理 null 或 undefined
            if (val === null || val === undefined) return "''";
            return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        });
    },
    
    // 🔍 探测器：统计表内数据量
    checkStats() {
        return new Promise((resolve) => {
            // #ifdef APP-PLUS
            const sqlMsg = "SELECT COUNT(*) as count FROM messages";
            const sqlDiary = "SELECT COUNT(*) as count FROM diaries";
            
            Promise.all([this.select(sqlMsg), this.select(sqlDiary)]).then(res => {
                console.log('--- 📊 数据库存量监控 ---');
                console.log(`💬 消息表: ${res[0][0].count} 条`);
                console.log(`📖 日记表: ${res[1][0].count} 条`);
                console.log('------------------------');
                resolve();
            });
            // #endif
        });
    }
};