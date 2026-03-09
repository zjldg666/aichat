// AiChat/composables/useCameraActions.js
// 专门负责处理与相机/拍照相关的互动逻辑（明拍、偷拍、合影）
import { CAMERA_REACTION_PROMPT } from '@/utils/prompts.js';

export function useCameraActions(context) {
    const {
        interactionMode, messageList, scrollToBottom,
        isSceneAnalyzing, runCameraManCheck, runGroupCameraCheck,
        currentAction, currentRelation, sendMessage
    } = context;

    // 🛠️ 公共等待函数
    const waitForActionSync = async () => {
        if (isSceneAnalyzing && isSceneAnalyzing.value) {
            console.log('🚧 [Camera] 动作分析未完成，挂起...');
            let timeout = 50;
            while (isSceneAnalyzing.value && timeout > 0) {
                await new Promise(r => setTimeout(r, 200));
                timeout--;
            }
        }
    };

    // 🛠️ 公共发送函数
    const sendCameraReactionPrompt = (soundContext) => {
        const cameraPrompt = CAMERA_REACTION_PROMPT
            .replace('{{current_action}}', currentAction.value || "站立")
            .replace('{{sound_context}}', soundContext)
            .replace('{{current_relation}}', currentRelation.value || "普通关系");

        sendMessage(false, cameraPrompt);
    };

    // 📸 1. 明拍模式
    const handleCameraSend = async () => {
        if (interactionMode.value !== 'face') return uni.showToast({ title: '非见面模式无法拍照', icon: 'none' });

        messageList.value.push({ role: 'system', content: '📸 咔嚓！(你大方地按下了快门)', isSystem: true });
        scrollToBottom();

        await waitForActionSync();
        await runCameraManCheck("System: Shutter Pressed", "");

        const soundContext = "(随着“咔嚓”一声清晰的快门声，你大方地拍了一张照片，她肯定听到了)";
        sendCameraReactionPrompt(soundContext);
    };

    // 👁️ 2. 偷拍模式
    const handleStealthCameraSend = async () => {
        if (interactionMode.value !== 'face') return uni.showToast({ title: '非见面模式无法偷拍', icon: 'none' });

        messageList.value.push({ role: 'system', content: '👁️ (你悄悄按下了拍摄键...)', isSystem: true });
        scrollToBottom();

        await waitForActionSync();
        await runCameraManCheck("System: Shutter Pressed", "");

        const soundContext = "(你趁她不注意，完全静音地抓拍了一张。她似乎完全没有察觉，依然沉浸在自己的事情中)";
        sendCameraReactionPrompt(soundContext);
    };

    // ✌️ 3. 合影模式
    const handleGroupCameraSend = async () => {
        if (interactionMode.value !== 'face') return uni.showToast({ title: '距离太远，无法合影', icon: 'none' });

        messageList.value.push({ role: 'system', content: '✌️ (你凑过去，举起手机准备拍张合影...)', isSystem: true });
        scrollToBottom();

        await waitForActionSync();
        await runGroupCameraCheck("System: User initiated a group selfie", "");

        const soundContext = "(随着“咔嚓”一声，你们两人的笑脸被定格在了屏幕上)";
        sendCameraReactionPrompt(soundContext);
    };

    return {
        handleCameraSend,
        handleStealthCameraSend,
        handleGroupCameraSend
    };
}