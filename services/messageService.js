import { DB } from '@/utils/db.js';

export const messageService = {
    // 1. 获取历史消息
    async getMessages(chatId) {
        try {
            const history = await DB.select(
                `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC`,
                [String(chatId)]
            );
            return history || [];
        } catch (e) {
            console.error('获取历史消息失败', e);
            return [];
        }
    },

    // 2. 保存单条消息
    async saveMessage(chatId, msg) {
        try {
            await DB.execute(
                `INSERT OR REPLACE INTO messages (id, chatId, role, content, type, isSystem, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    msg.id || (Date.now() + Math.random()),
                    String(chatId),
                    msg.role,
                    msg.content,
                    msg.type || 'text',
                    msg.isSystem ? 1 : 0,
                    Date.now()
                ]
            );
            return true;
        } catch (e) {
            console.error('保存消息失败', e);
            return false;
        }
    },

    // 3. 批量物理删除消息
    async deleteMessages(ids) {
        try {
            const idsStr = ids.map(id => `'${id}'`).join(',');
            await DB.execute(`DELETE FROM messages WHERE id IN (${idsStr})`);
            return true;
        } catch (e) {
            console.error('删除消息失败', e);
            return false;
        }
    }
};