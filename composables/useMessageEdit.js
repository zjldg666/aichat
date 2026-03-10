// AiChat/composables/useMessageEdit.js
// 专门负责处理聊天气泡的长按编辑、多选与物理删除逻辑
import { ref } from 'vue';
import { messageService } from '@/services/messageService.js';

export function useMessageEdit(context) {
    const { messageList, isLoading } = context;

    const isEditMode = ref(false);
    const selectedIds = ref([]);

    // 1. 进入编辑模式并默认选中当前长按的消息
    const enterEditMode = (msg) => {
        if (isLoading.value) return;
        isEditMode.value = true;
        selectedIds.value = [msg.id];
        uni.vibrateShort(); // 震动反馈
    };

    // 2. 切换选择
    const toggleSelect = (msg) => {
        const index = selectedIds.value.indexOf(msg.id);
        if (index > -1) {
            selectedIds.value.splice(index, 1);
            if (selectedIds.value.length === 0) isEditMode.value = false; // 选完了自动退出
        } else {
            selectedIds.value.push(msg.id);
        }
    };

    // 3. 取消编辑
    const cancelEdit = () => {
        isEditMode.value = false;
        selectedIds.value = [];
    };

    // 4. 执行删除
    const confirmDelete = () => {
        uni.showModal({
            title: '物理删除',
            content: '确定要从数据库中永久抹除这些记忆吗？',
            success: async (res) => {
                if (res.confirm) {
                    // 1. 内存删除
                    messageList.value = messageList.value.filter(m => !selectedIds.value.includes(m.id));
                    // 2. 数据库删除：呼叫服务站干掉它们
                    await messageService.deleteMessages(selectedIds.value);

                    cancelEdit();
                    uni.showToast({
                        title: '已物理抹除',
                        icon: 'success'
                    });
                }
            }
        });
    };

    return {
        isEditMode, selectedIds,
        enterEditMode, toggleSelect, cancelEdit, confirmDelete
    };
}