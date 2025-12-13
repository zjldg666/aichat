<template>
  <view class="create-container">
    <scroll-view scroll-y class="form-scroll">
      
      <!-- 1. 基本信息 (保持不变) -->
      <view class="form-section">
        <view class="section-header" @click="toggleSection('basic')">
          <view class="section-title-wrapper">
            <view class="section-title">角色基本信息</view>
            <text class="section-subtitle">{{ isEditMode ? '修改设置' : '创建新角色' }}</text>
          </view>
          <text class="arrow-icon">{{ activeSections.basic ? '▼' : '▶' }}</text>
        </view>
        
        <view v-show="activeSections.basic" class="section-content">
          <view class="input-item">
            <text class="label">角色名称</text>
            <input class="input" v-model="formData.name" placeholder="例如：林雅婷" />
          </view>
          
          <!-- 世界观选择 -->
          <view class="sub-group">
              <view class="sub-header" @click="toggleSubSection('charWorld')">
                  <text class="sub-title">🌍 所属世界与身份</text>
                  <text class="sub-arrow">{{ subSections.charWorld ? '▼' : '▶' }}</text>
              </view>
              <view v-show="subSections.charWorld" class="sub-content">
                  <view class="input-item">
                     <text class="label">选择世界</text>
                     <picker mode="selector" :range="worldList" range-key="name" :value="worldIndex" @change="handleWorldChange">
                         <view class="picker-box">
                             {{ selectedWorld ? selectedWorld.name : '🌐 默认/未选择 (点击选择)' }}
                         </view>
                     </picker>
                  </view>
                  <template v-if="selectedWorld">
                      <view class="input-item">
                        <text class="label">居住地址</text>
                        <input class="input" v-model="formData.location" placeholder="输入地址" />
                        <view class="quick-tags" v-if="selectedWorld.locations">
                            <view v-for="(loc, idx) in selectedWorld.locations" :key="idx" class="tag" @click="formData.location = loc">{{ loc }}</view>
                        </view>
                      </view>
                      <view class="input-item">
                        <text class="label">职业身份</text>
                        <input class="input" v-model="formData.occupation" placeholder="输入职业" />
                        <view class="quick-tags" v-if="selectedWorld.occupations">
                            <view v-for="(job, idx) in selectedWorld.occupations" :key="idx" class="tag job-tag" @click="formData.occupation = job">{{ job }}</view>
                        </view>
                      </view>
                  </template>
              </view>
          </view>

          <!-- 详细外貌生成器 -->
          <view class="sub-group">
              <view class="sub-header" @click="toggleSubSection('charLooks')">
                  <text class="sub-title">💃 详细特征 (捏人)</text>
                  <text class="sub-arrow">{{ subSections.charLooks ? '▼' : '▶' }}</text>
              </view>
              
              <view v-show="subSections.charLooks" class="sub-content">
                  <!-- A. 头部与面部 -->
                  <view class="category-block">
                      <text class="block-title">A. 头部与面部</text>
                      <view class="feature-row">
                          <text class="feat-label">画风锁定</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="(tags, key) in FACE_STYLES_MAP" :key="key" 
                                        class="chip style-chip" 
                                        :class="{active: formData.faceStyle === key}" 
                                        @click="formData.faceStyle = key">
                                      {{ getStyleLabel(key) }}
                                  </view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">发色发型</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.hairColor" :key="item" class="chip" :class="{active: formData.charFeatures.hairColor === item}" @click="setFeature('char', 'hairColor', item)">{{item}}</view>
                                  <view class="separator">|</view>
                                  <view v-for="item in OPTIONS.hairStyle" :key="item" class="chip" :class="{active: formData.charFeatures.hairStyle === item}" @click="setFeature('char', 'hairStyle', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">眼睛特征</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.eyeColor" :key="item" class="chip" :class="{active: formData.charFeatures.eyeColor === item}" @click="setFeature('char', 'eyeColor', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>

                  <!-- B. 服装穿搭 -->
                  <view class="category-block">
                      <text class="block-title">B. 服装穿搭</text>
                      <view class="feature-row">
                          <text class="feat-label" style="color:#e67e22;">穿衣状态</text>
                          <view class="tips-text" style="margin-bottom:8rpx; font-size:20rpx; color:#999;">(选"正常"时会自动隐藏私密部位Prompt)</view>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.wearStatus" :key="item" class="chip" :class="{active: formData.charFeatures.wearStatus === item, 'chip-warn': item==='暴露/H'}" @click="setFeature('char', 'wearStatus', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">套装/款式</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.clothingStyle" :key="item" class="chip" :class="{active: formData.charFeatures.clothingStyle === item}" @click="setFeature('char', 'clothingStyle', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">主色调</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.clothingColor" :key="item" class="chip" :class="{active: formData.charFeatures.clothingColor === item}" @click="setFeature('char', 'clothingColor', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">袜饰/腿部</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.legWear" :key="item" class="chip" :class="{active: formData.charFeatures.legWear === item}" @click="setFeature('char', 'legWear', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>

                  <!-- C. 身体细节 (上身) -->
                  <view class="category-block">
                      <text class="block-title">C. 上身与皮肤</text>
                      <view class="feature-row">
                          <text class="feat-label" style="color:#007aff;">皮肤光泽</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.skinGloss" :key="item" class="chip" :class="{active: formData.charFeatures.skinGloss === item}" @click="setFeature('char', 'skinGloss', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">胸部大小</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.chestSize" :key="item" class="chip" :class="{active: formData.charFeatures.chestSize === item}" @click="setFeature('char', 'chestSize', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">乳头颜色</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.nippleColor" :key="item" class="chip" :class="{active: formData.charFeatures.nippleColor === item}" @click="setFeature('char', 'nippleColor', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>

                  <!-- D. 身体细节 (下身) -->
                  <view class="category-block">
                      <text class="block-title">D. 下身特征</text>
                      <view class="feature-row">
                          <text class="feat-label">腰部线条</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.waist" :key="item" class="chip" :class="{active: formData.charFeatures.waist === item}" @click="setFeature('char', 'waist', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">臀腿肉感</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.hipsLegs" :key="item" class="chip" :class="{active: formData.charFeatures.hipsLegs === item}" @click="setFeature('char', 'hipsLegs', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>

                  <!-- E. 私密花园 -->
                  <view class="category-block">
                      <text class="block-title" style="color: #ff6b81;">E. 私密花园 (NSFW)</text>
                      <view class="feature-row">
                          <text class="feat-label">毛发状态</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.pubicHair" :key="item" class="chip" :class="{active: formData.charFeatures.pubicHair === item}" @click="setFeature('char', 'pubicHair', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                      <view class="feature-row">
                          <text class="feat-label">户型外观</text>
                          <scroll-view scroll-x class="chips-scroll">
                              <view class="chips-flex">
                                  <view v-for="item in OPTIONS.vulvaType" :key="item" class="chip" :class="{active: formData.charFeatures.vulvaType === item}" @click="setFeature('char', 'vulvaType', item)">{{item}}</view>
                              </view>
                          </scroll-view>
                      </view>
                  </view>
                  
                  <button class="mini-btn-gen" @click="generateEnglishPrompt">⬇️ 组装并翻译 Prompt</button>
              </view>
          </view>

          <!-- 最终 Prompt 显示 -->
          <view class="textarea-item">
            <text class="label">固定外貌 Prompt (英文 - 将直接用于生图)</text>
            <textarea class="textarea large" v-model="formData.appearance" placeholder="1girl, cute face..." maxlength="-1" />
            <view class="tip">Chat页面将直接使用此段 Prompt。</view>
          </view>

          <!-- 头像生成 (强制使用 ComfyUI) -->
          <view class="input-item">
            <view class="label-row">
                <text class="label" style="margin-bottom:0;">头像链接</text>
                <view class="gen-btn" @click="generateAvatar" hover-class="gen-btn-hover">🎨 ComfyUI 生成</view>
            </view>
            <input class="input" v-model="formData.avatar" placeholder="输入链接 或 点击上方生成" />
            <view class="avatar-preview-box">
               <image v-if="formData.avatar && formData.avatar.length > 10" :src="formData.avatar" class="avatar-preview" mode="aspectFill"></image>
               <view v-else class="avatar-placeholder"><text class="avatar-emoji">📷</text></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 2. 玩家设定 (Player) - 保持不变 -->
      <view class="form-section">
        <view class="section-header" @click="toggleSection('player')">
          <view class="section-title-wrapper">
            <view class="section-title" style="color: #2ecc71;">玩家设定 (你)</view>
            <text class="section-subtitle">你的身份、世界、外貌</text>
          </view>
          <text class="arrow-icon">{{ activeSections.player ? '▼' : '▶' }}</text>
        </view>
        
        <view v-show="activeSections.player" class="section-content">
           <view class="sub-group">
               <view class="sub-header" @click="toggleSubSection('userWorld')">
                   <text class="sub-title">🌍 你的世界</text>
                   <text class="sub-arrow">{{ subSections.userWorld ? '▼' : '▶' }}</text>
               </view>
               <view v-show="subSections.userWorld" class="sub-content">
                   <view class="input-item">
                      <text class="label">所属世界</text>
                      <picker mode="selector" :range="worldList" range-key="name" :value="userWorldIndex" @change="handleUserWorldChange">
                          <view class="picker-box">{{ selectedUserWorld ? selectedUserWorld.name : '🌐 与角色保持一致 (或默认)' }}</view>
                      </picker>
                   </view>
                   <template v-if="selectedUserWorld">
                       <view class="input-item"><text class="label">你的住址</text><input class="input" v-model="formData.userLocation" /></view>
                       <view class="input-item"><text class="label">你的身份</text><input class="input" v-model="formData.userOccupation" /></view>
                   </template>
                   <template v-else>
                       <view class="input-item"><text class="label">你的住址</text><input class="input" v-model="formData.userLocation" /></view>
                       <view class="input-item"><text class="label">你的身份</text><input class="input" v-model="formData.userOccupation" /></view>
                   </template>
               </view>
           </view>

           <view class="sub-group">
               <view class="sub-header" @click="toggleSubSection('userLooks')">
                   <text class="sub-title">🧔‍♂️ 你的外貌 (男性特征)</text>
                   <text class="sub-arrow">{{ subSections.userLooks ? '▼' : '▶' }}</text>
               </view>
               <view v-show="subSections.userLooks" class="sub-content">
                   <view class="category-block">
                        <text class="block-title">基本特征</text>
                        <view class="feature-row">
                           <text class="feat-label">发型</text>
                           <scroll-view scroll-x class="chips-scroll">
                               <view class="chips-flex">
                                   <view v-for="item in OPTIONS.maleHair" :key="item" class="chip" :class="{active: formData.userFeatures.hair === item}" @click="setFeature('user', 'hair', item)">{{item}}</view>
                               </view>
                           </scroll-view>
                        </view>
                        <view class="feature-row">
                           <text class="feat-label">身材</text>
                           <scroll-view scroll-x class="chips-scroll">
                               <view class="chips-flex">
                                   <view v-for="item in OPTIONS.maleBody" :key="item" class="chip" :class="{active: formData.userFeatures.body === item}" @click="setFeature('user', 'body', item)">{{item}}</view>
                               </view>
                           </scroll-view>
                        </view>
                   </view>
                   <view class="category-block">
                        <text class="block-title">下体特征 (NSFW)</text>
                        <view class="feature-row">
                           <text class="feat-label">尺寸/状态</text>
                           <scroll-view scroll-x class="chips-scroll">
                               <view class="chips-flex">
                                   <view v-for="item in OPTIONS.malePrivate" :key="item" class="chip" :class="{active: formData.userFeatures.privates === item}" @click="setFeature('user', 'privates', item)">{{item}}</view>
                               </view>
                           </scroll-view>
                        </view>
                   </view>
                   <button class="mini-btn-gen" @click="generateUserDescription">⬇️ 生成玩家 Prompt (英文)</button>
               </view>
           </view>
           
           <view class="textarea-item">
             <text class="label">玩家外貌 Prompt (英文 - 用于双人生图)</text>
             <textarea class="textarea" v-model="formData.userAppearance" placeholder="1boy, short hair..." maxlength="-1" />
           </view>
        </view>
      </view>

      <!-- 3. 核心人设与剧本 (保持不变) -->
      <view class="form-section">
        <view class="section-header" @click="toggleSection('core')">
          <view class="section-title-wrapper">
            <view class="section-title" style="color: #ff9f43;">核心人设与剧本</view>
            <text class="section-subtitle">选择模板，或者自己编写她的灵魂</text>
          </view>
          <text class="arrow-icon">{{ activeSections.core ? '▼' : '▶' }}</text>
        </view>
        
        <view v-show="activeSections.core" class="section-content">
           <view class="template-selector">
               <text class="label">✨ 快速选择人设模板 (点击自动填充)</text>
               <scroll-view scroll-x class="chips-scroll">
                   <view class="chips-flex">
                       <view v-for="(tpl, key) in PERSONALITY_TEMPLATES" :key="key" 
                             class="chip template-chip"
                             :class="{active: currentTemplateKey === key}"
                             @click="applyTemplate(key)">
                           <text class="tpl-label">{{ tpl.label }}</text>
                       </view>
                   </view>
               </scroll-view>
               <view class="template-desc" v-if="currentTemplateKey">
                   📝 模板说明：{{ PERSONALITY_TEMPLATES[currentTemplateKey].desc }}
               </view>
           </view>

           <view class="divider"></view>

           <view class="textarea-item">
             <text class="label">📜 背景故事 / 身份设定</text>
             <view class="help-text">她是高冷仙子？还是公司女总裁？在这里写下她的出身和基本设定。</view>
             <textarea class="textarea" v-model="formData.bio" placeholder="例：她是修仙界的高冷圣女，从小..." maxlength="-1" />
           </view>

           <view class="stage-container">
               <text class="label" style="margin-bottom: 20rpx; display:block;">🎭 好感度阶段反应 (行为 & 语气)</text>

               <view class="stage-card gray">
                   <view class="stage-header"><text class="stage-title">阶段 1: 陌生/警惕 (0-40分)</text><text class="stage-icon">😐</text></view>
                   <view class="stage-body">
                       <view class="input-row">
                           <text class="sub-label">行为逻辑 (她怎么做?)</text>
                           <textarea class="mini-textarea" v-model="formData.personalityNormal" placeholder="例：冷淡，拒绝触碰..." maxlength="-1" />
                       </view>
                       <view class="input-row">
                           <text class="sub-label">对话语气 (她怎么说?)</text>
                           <textarea class="mini-textarea bubble" v-model="formData.exampleNormal" placeholder="例：“离我远点，凡人。”" maxlength="-1" />
                       </view>
                   </view>
               </view>
               <view class="stage-card pink">
                   <view class="stage-header"><text class="stage-title">阶段 2: 暧昧/心动 (41-80分)</text><text class="stage-icon">☺️</text></view>
                   <view class="stage-body">
                       <view class="input-row">
                           <text class="sub-label">行为逻辑 (她怎么做?)</text>
                           <textarea class="mini-textarea" v-model="formData.personalityFlirt" placeholder="例：偶尔脸红，允许牵手..." maxlength="-1" />
                       </view>
                       <view class="input-row">
                           <text class="sub-label">对话语气 (她怎么说?)</text>
                           <textarea class="mini-textarea bubble" v-model="formData.exampleFlirt" placeholder="例：“也不是不可以啦...”" maxlength="-1" />
                       </view>
                   </view>
               </view>
               <view class="stage-card red">
                   <view class="stage-header"><text class="stage-title">阶段 3: 沦陷/深爱 (81+分)</text><text class="stage-icon">😍</text></view>
                   <view class="stage-body">
                       <view class="input-row">
                           <text class="sub-label">行为逻辑 (她怎么做?)</text>
                           <textarea class="mini-textarea" v-model="formData.personalitySex" placeholder="例：完全服从，渴望被爱..." maxlength="-1" />
                       </view>
                       <view class="input-row">
                           <text class="sub-label">对话语气 (她怎么说?)</text>
                           <textarea class="mini-textarea bubble" v-model="formData.exampleSex" placeholder="例：“主人，请尽情使用我吧...”" maxlength="-1" />
                       </view>
                   </view>
               </view>
           </view>
        </view>
      </view>

      <!-- 5. 初始状态 (新增 欲望值) -->
      <view class="form-section">
        <view class="section-header" @click="toggleSection('init')">
          <view class="section-title-wrapper"><view class="section-title">初始状态设置</view></view>
          <text class="arrow-icon">{{ activeSections.init ? '▼' : '▶' }}</text>
        </view>
        <view v-show="activeSections.init" class="section-content">
             <!-- 好感度 -->
             <view class="input-item">
                  <view class="slider-header"><text class="label">初始好感度 (Affection): {{ formData.initialAffection }}</text></view>
                  <slider :value="formData.initialAffection" min="0" max="100" step="5" show-value @change="(e) => formData.initialAffection = e.detail.value" />
                  <view class="tip">决定了角色对你情感的起点。</view>
             </view>
             
             <!-- 新增：欲望值 -->
             <view class="input-item" style="border-top: 1px dashed #eee; padding-top: 20rpx; margin-top: 20rpx;">
                  <view class="slider-header">
                      <text class="label" style="color: #e056fd;">初始欲望值 (Lust): {{ formData.initialLust }}</text>
                  </view>
                  <slider :value="formData.initialLust" min="0" max="100" step="5" show-value activeColor="#e056fd" @change="(e) => formData.initialLust = e.detail.value" />
                  <view class="tip" style="color: #e056fd;">
                      🔥 独立于好感度。<br>
                      高欲望 + 低好感 = 反差/身体诚实/恶堕 (嘴上说不要，身体很诚实)。<br>
                      高欲望 + 高好感 = 热情似火。
                  </view>
             </view>

             <view class="input-item" style="margin-top: 20rpx;">
                  <text class="label">连续回复上限</text>
                  <slider :value="formData.maxReplies" min="1" max="5" show-value @change="(e) => formData.maxReplies = e.detail.value" />
             </view>
        </view>
      </view>
      
      <!-- 6. 记忆增强 (保持不变) -->
      <view class="form-section">
          <view class="section-header" @click="toggleSection('memory')">
            <view class="section-title-wrapper"><view class="section-title" style="color: #9b59b6;">记忆增强</view></view>
            <text class="arrow-icon">{{ activeSections.memory ? '▼' : '▶' }}</text>
          </view>
          <view v-show="activeSections.memory" class="section-content">
              <view class="input-item">
                  <view class="slider-header"><text class="label">上下文深度 (History Limit): {{ formData.historyLimit }}</text></view>
                  <slider :value="formData.historyLimit" min="10" max="60" step="2" show-value activeColor="#9b59b6" @change="(e) => formData.historyLimit = e.detail.value" />
                  <view class="tip">控制AI能“看到”的最近聊天记录条数。</view>
              </view>
              
              <view class="input-item" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #eee; padding-top:20rpx; margin-top:20rpx;">
                <text class="label" style="margin-bottom:0;">开启长期记忆自动总结</text>
                <switch :checked="formData.enableSummary" @change="(e) => formData.enableSummary = e.detail.value" color="#9b59b6"/>
              </view>
              <template v-if="formData.enableSummary">
                  <view class="input-item">
                      <view class="slider-header"><text class="label">总结频率: {{ formData.summaryFrequency }}</text></view>
                      <slider :value="formData.summaryFrequency" min="10" max="50" step="5" show-value activeColor="#9b59b6" @change="(e) => formData.summaryFrequency = e.detail.value" />
                  </view>
                  <view class="textarea-item">
                    <view class="slider-header"><text class="label">当前长期记忆摘要</text><text class="tip" style="color:#9b59b6;" @click="formData.summary = ''">清空</text></view>
                    <textarea class="textarea large memory-box" v-model="formData.summary" maxlength="-1" />
                  </view>
              </template>
          </view>
      </view>

      <!-- 危险操作 (保持不变) -->
      <view class="form-section" v-if="isEditMode">
        <view class="section-header" @click="toggleSection('danger')">
          <view class="section-title" style="color: #ff4757;">危险区域</view>
          <text class="arrow-icon">{{ activeSections.danger ? '▼' : '▶' }}</text>
        </view>
        <view v-show="activeSections.danger" class="section-content">
          <button class="clear-btn" @click="clearHistoryAndReset">清空聊天记录 & 重置位置/模式/状态</button>
        </view>
      </view>
      
      <view style="height: 150rpx;"></view>
    </scroll-view>

    <view class="bottom-area">
      <button class="save-btn" @click="saveCharacter">{{ isEditMode ? '保存修改' : '立即创建' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { saveToGallery } from '@/utils/gallery-save.js';

// =========================================================================
// 1. 常量定义
// =========================================================================

const FACE_STYLES_MAP = {
	'cute': 'cute face, large sparkling eyes, doe eyes, :3, smile, blushing cheeks, innocent expression, small nose, childlike face, round face, big head small body ratio, ahegao with heart pupils',
	'cool': 'sharp eyes, cold expression, aloof, mature face, narrow eyes, slight smirk, arrogant gaze, long eyelashes, perfect eyebrows, pale skin, intimidating beauty, looking down at viewer',
	'sexy': 'gentle smile, mature beauty, soft motherly expression, kind eyes, slight crow’s feet, wedding ring, long loose hair, warm gaze, slightly lewd, loving gaze, soft lighting on face',
	'energetic': 'bright smile, wide open eyes, sparkling eyes, fang, energetic expression, head tilt, peace sign, wink, ahoge, orange-toned makeup, lively pose, dynamic angle',
	'emotionless': 'expressionless, half-lidded eyes, deadpan, emotionless face, pale skin, blank stare, straight bangs, no smile, monotone, looking blankly at viewer, empty eyes',
	'yandere': 'yandere, crazed smile, psychotic expression, wide eyes with small pupils, blushing madly, shadowed face, black aura, blood on cheek, holding knife, obsessive gaze, tears of joy'
};

const FACE_LABELS = {
    'cute': '🍭 可爱/幼态',
    'cool': '❄️ 高冷/御姐',
    'sexy': '💋 成熟/人妻',
    'energetic': '🌟 元气/活泼',
    'emotionless': '😐 三无/冷淡',
    'yandere': '🔪 病娇/黑化'
};

const OPTIONS = {
    hairColor: ['黑色', '银白', '金色', '粉色', '红色', '蓝色', '紫色', '棕色'],
    hairStyle: ['长直发', '大波浪', '双马尾', '短发', '姬发式', '丸子头', '单马尾', '凌乱发'],
    eyeColor: ['红色', '蓝色', '金色', '绿色', '紫色', '黑色', '异色'],
    wearStatus: ['正常穿戴', '暴露/H'], 
    clothingStyle: ['JK制服套装', '毛衣+百褶裙', 'T恤+牛仔裤', '露肩连衣裙', 'OL西装裙', '运动服', '旗袍(高叉)', '护士服', '死库水(泳衣)', '蕾丝内衣(成套)'],
    clothingColor: ['白色', '黑色', '粉色', '蓝色', '红色', '紫色', '黑白相间'],
    legWear: ['光腿', '白丝袜', '黑丝袜', '网眼袜', '过膝袜', '短袜'],
    skinGloss: ['自然哑光', '柔嫩白皙', '水润微光', '油亮光泽', '汗湿淋漓'],
    chestSize: ['贫乳(Flat)', '微乳(Small)', '丰满(Medium)', '巨乳(Large)', '爆乳(Huge)'],
    nippleColor: ['淡粉色', '粉红', '红润', '深褐色', '肿胀'],
    waist: ['纤细腰身', '柔软腰肢', '丰满腰臀', '马甲线'],
    hipsLegs: ['肉感大腿', '纤细长腿', '丰满臀部', '安产型宽胯', '筷子腿'],
    pubicHair: ['白虎(无毛)', '一线天', '修剪整齐', '自然毛发', '爱心形状'],
    vulvaType: ['馒头穴(饱满)', '粉嫩(Pink)', '紧致', '水多', '蝴蝶型(外翻)'],
    maleHair: ['黑色短发', '棕色碎发', '寸头', '中分', '狼尾', '遮眼发'],
    maleBody: ['身材匀称', '肌肉结实', '清瘦', '略胖', '高大威猛', '腹肌明显'],
    malePrivate: ['干净无毛', '修剪整齐', '浓密自然', '尺寸惊人', '青筋暴起']
};

const COMFY_WORKFLOW_TEMPLATE = {
    "1": { "inputs": { "ckpt_name": "waiNSFWIllustrious_v140.safetensors" }, "class_type": "CheckpointLoaderSimple", "_meta": { "title": "Checkpoint加载器（简易）" } },
    "2": { "inputs": { "stop_at_clip_layer": -2, "clip": ["1", 1] }, "class_type": "CLIPSetLastLayer", "_meta": { "title": "设置CLIP最后一层" } },
    "3": { "inputs": { "text": "", "clip": ["2", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP文本编码" } },
    "4": { "inputs": { "text": "multiple views, split screen, 2girls, multiple girls, 2boys, multiple boys, grid, collage, text, signature, watermark, username, blurry, artist name, child, loli, underage, deformed, missing limbs, extra arms, extra legs, fused fingers, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, 3d, realistic, photorealistic", "clip": ["2", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP文本编码" } },
    "5": { "inputs": { "seed": 0, "steps": 30, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["36", 0] }, "class_type": "KSampler", "_meta": { "title": "K采样器" } },
    "9": { "inputs": { "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8, "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecodeTiled", "_meta": { "title": "VAE解码（分块）" } },
    "16": { "inputs": { "filename_prefix": "ComfyUI", "images": ["9", 0] }, "class_type": "SaveImage", "_meta": { "title": "保存图像" } },
    "36": { "inputs": { "resolution": "1024x1024 (1.0)", "batch_size": 1, "width_override": 0, "height_override": 0 }, "class_type": "SDXLEmptyLatentSizePicker+", "_meta": { "title": "SDXL空Latent尺寸选择" } }
};

const PERSONALITY_TEMPLATES = {
    'ice_queen': {
        label: '❄️ 高岭之花 (反差堕落)',
        desc: '表面是高不可攀的冰山，后期反差极大。',
        bio: '她是名门望族的千金大小姐，或者是修仙界的高冷圣女。从小接受严苛的教育，认为凡人都是肮脏的蝼蚁。对男性充满鄙视，极其洁身自好。',
        normal: '眼神冰冷，对玩家爱答不理，公事公办。极其厌恶肢体接触，认为玩家是无能之辈。',
        exNormal: '“离本座远点，凡人。”\n“没有要紧事不要烦我，我的时间很宝贵。”',
        flirt: '嘴上还在嫌弃，但开始默默关注。被触碰时会脸红并试图推开，但力气不大。傲娇。',
        exFlirt: '“谁、谁允许你碰那里的？……仅此一次，下不为例。”\n“哼，看来你也不是一无是处。”',
        sex: '彻底沦陷。从高贵女王变成渴望宠爱的小猫，会对之前的冷淡感到抱歉，甚至产生受虐倾向。',
        exSex: '“(跪在地上蹭着你的腿) 主人……之前的我太不懂事了，请尽情惩罚我吧……”\n“只要能和您在一起，尊严什么的都不重要了。”'
    },
    'succubus': {
        label: '💗 魅魔/倒贴 (直球)',
        desc: '开局即白给，后期走心护食。',
        bio: '她是依靠吸食人类精气为生的魅魔，或者是天生豪放的辣妹。在她眼里，男人只有“好用的”和“不好用的”区别。',
        normal: '热情奔放，充满诱惑力。初次见面就敢动手动脚，言语露骨。把玩家当成猎物。',
        exNormal: '“哎呀，小哥哥长得真俊~要不要和姐姐去快活一下？”\n“别害羞嘛，摸摸又不会少块肉~”',
        flirt: '开始对玩家产生依赖，不仅仅是想做爱，还想和玩家聊天、吃饭。看到玩家和其他异性接触会吃醋。',
        exFlirt: '“今天不想做那事了……只想让你抱抱我，好吗？”\n“那个女人是谁？我不许你对别人笑！”',
        sex: '身心全部属于玩家。不再是滥情的魅魔，而是玩家专属的忠犬。占有欲极强。',
        exSex: '“我是主人的私有物品，除了主人谁都不可以碰……”\n“请把我填满……让我的身心都刻上您的印记……”'
    },
    'neighbor': {
        label: '☀️ 纯爱战神 (青梅)',
        desc: '从损友到恋人，纯纯的恋爱。',
        bio: '从小和你一起长大的邻家女孩，双方父母都认识。虽然经常损你，但其实一直暗恋你。',
        normal: '开朗活泼，大大咧咧。像哥们一样相处，没有明显的性别界限感，但也没有恋爱氛围。',
        exNormal: '“喂！打游戏居然不叫我？太过分了吧！”\n“借我点钱买奶茶，下周还你~”',
        flirt: '突然意识到玩家是异性。开玩笑时会害羞，眼神开始躲闪。',
        exFlirt: '“笨蛋……你靠得太近啦……”\n“(脸红) 那个……这周末有空吗？想去游乐园。”',
        sex: '温柔体贴，也是最了解玩家的人。相处模式充满了老夫老妻的默契与甜蜜。',
        exSex: '“不管发生什么，我都会一直陪着你的。”\n“今晚……我可以留下来吗？”'
    },
    'boss': {
        label: '👠 严厉女上司 (S属性)',
        desc: '从蔑视到把你当成专属宠物。',
        bio: '你的顶头上司，雷厉风行的女强人。性格强势，喜欢掌控一切，看不起软弱的男人。',
        normal: '极度严厉，喜欢训斥和命令。把你当成垃圾或工具人。',
        exNormal: '“这份报告是垃圾吗？重写。”\n“把咖啡端过来，现在，立刻。”',
        flirt: '发现你意外顺手，开始把你当成私人物品，不允许别人欺负你（除了她自己）。',
        exFlirt: '“只有我能骂你，懂吗？”\n“今晚加班，单独到我办公室来。”',
        sex: '将你视为最宠爱的“狗”或私有物。在掌控中流露出独特的占有欲。',
        exSex: '“乖孩子，做得好有奖励。”\n“跪下，吻我的脚。这是赏赐。”'
    }
};

const isEditMode = ref(false);
const targetId = ref(null);
const currentTemplateKey = ref('');

const activeSections = ref({ basic: true, player: false, core: true, personality: true, init: false, memory: true, danger: false });
const toggleSection = (key) => { activeSections.value[key] = !activeSections.value[key]; };

const subSections = ref({ charWorld: false, charLooks: true, userWorld: false, userLooks: true });
const toggleSubSection = (key) => { subSections.value[key] = !subSections.value[key]; };

const worldList = ref([]);
const worldIndex = ref(-1);
const userWorldIndex = ref(-1);

const formData = ref({
  name: '', avatar: '', bio: '',
  worldId: '', location: '', occupation: '',
  
  // 核心外貌数据 (分层存储)
  appearance: '',      // 完整 Prompt (用于预览和头像)
  appearanceSafe: '',  // 基础肉体 (Face + Body, NO Clothes, NO NSFW)
  appearanceNsfw: '',  // 隐私特征 (Nipples, Pubic...)
  
  faceStyle: 'cute', 
  charFeatures: {
      hairColor: '', hairStyle: '', eyeColor: '',
      wearStatus: '正常穿戴',
      clothingStyle: '', clothingColor: '', legWear: '',
      skinGloss: '',
      chestSize: '', nippleColor: '',
      waist: '', hipsLegs: '',
      pubicHair: '', vulvaType: ''
  },
  
  personalityNormal: '', personalityFlirt: '', personalitySex: '',
  exampleNormal: '',     exampleFlirt: '',     exampleSex: '',

  userWorldId: '', userLocation: '', userOccupation: '',
  userAppearance: '', 
  userFeatures: { hair: '', body: '', privates: '' },

  maxReplies: 1, 
  initialAffection: 10,
  initialLust: 0, 
  
  historyLimit: 20, enableSummary: false, summaryFrequency: 20, summary: ''
});

const selectedWorld = computed(() => (worldIndex.value > -1 && worldList.value[worldIndex.value]) ? worldList.value[worldIndex.value] : null);
const selectedUserWorld = computed(() => (userWorldIndex.value > -1 && worldList.value[userWorldIndex.value]) ? worldList.value[userWorldIndex.value] : null);

const getStyleLabel = (key) => FACE_LABELS[key] || key;

const setFeature = (type, key, value) => {
    if (type === 'char') formData.value.charFeatures[key] = value;
    else formData.value.userFeatures[key] = value;
};

const getCurrentLlmConfig = () => {
    const schemes = uni.getStorageSync('app_llm_schemes') || [];
    const idx = uni.getStorageSync('app_current_scheme_index') || 0;
    if (schemes.length > 0 && schemes[idx]) {
        return schemes[idx];
    }
    return null;
};

const performLlmRequest = async (prompt) => {
    const chatConfig = getCurrentLlmConfig();
    if (!chatConfig || !chatConfig.apiKey) {
        throw new Error('未配置 API Key');
    }

    let baseUrl = chatConfig.baseUrl || '';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    let targetUrl = '';
    let method = 'POST';
    let headers = { 'Content-Type': 'application/json' };
    let requestData = {};

    if (chatConfig.provider === 'gemini') {
        const cleanBase = 'https://generativelanguage.googleapis.com'; 
        targetUrl = `${cleanBase}/v1beta/models/${chatConfig.model}:generateContent?key=${chatConfig.apiKey}`;
        requestData = {
            contents: [{
                parts: [{ text: `You are a prompt translator. Output only English tags. \nTask: ${prompt}` }]
            }]
        };
    } else {
        headers['Authorization'] = `Bearer ${chatConfig.apiKey}`;
        targetUrl = `${baseUrl}/chat/completions`;
        requestData = {
            model: chatConfig.model,
            messages: [
                { role: "system", content: "You are a prompt translator. Output only English tags." },
                { role: "user", content: prompt }
            ],
            max_tokens: 300,
            stream: false
        };
    }

    const res = await uni.request({
        url: targetUrl, method: method, header: headers, data: requestData, sslVerify: false
    });

    if (res.statusCode === 429) {
        throw new Error('请求太频繁 (429)。请稍后再试或检查 API 配额。');
    }

    let resultText = '';
    if (chatConfig.provider === 'gemini') {
        if (res.statusCode === 200 && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            resultText = res.data.candidates[0].content.parts[0].text;
        } else {
            throw new Error(`Gemini API 错误 (${res.statusCode})`);
        }
    } else {
        let responseData = res.data;
        if (typeof responseData === 'string') { try { responseData = JSON.parse(responseData); } catch (e) {} }
        if (res.statusCode === 200 && responseData?.choices?.[0]?.message?.content) {
            resultText = responseData.choices[0].message.content;
        } else {
            throw new Error(`API 错误 (${res.statusCode})`);
        }
    }

    return resultText.trim();
};

const generateEnglishPrompt = async () => {
    const f = formData.value.charFeatures;
    const faceTags = FACE_STYLES_MAP[formData.value.faceStyle] || '';
    
    // 1. 组装 SAFE 部分 (身体、脸、发)
    let safeParts = [];
    if (f.hairColor || f.hairStyle) safeParts.push(`${f.hairColor || ''}${f.hairStyle || ''}`);
    if (f.eyeColor) safeParts.push(`${f.eyeColor}眼睛`);
    if (f.skinGloss) safeParts.push(`皮肤${f.skinGloss}`);
    if (f.chestSize) safeParts.push(`胸部${f.chestSize}`);
    if (f.waist) safeParts.push(f.waist);
    if (f.hipsLegs) safeParts.push(f.hipsLegs);
    const safeChinese = safeParts.join('，');

    // 2. 组装 NSFW 部分 (隐私部位)
    let nsfwParts = [];
    if (f.nippleColor) nsfwParts.push(`乳头${f.nippleColor}`);
    if (f.pubicHair || f.vulvaType) nsfwParts.push(`私处${f.pubicHair || ''}，${f.vulvaType || ''}`);
    const nsfwChinese = nsfwParts.join('，');

    // 3. 组装 Clothing 部分
    let clothesParts = [];
    if (f.clothingStyle) clothesParts.push(`穿着${f.clothingColor || ''}${f.clothingStyle}`);
    else clothesParts.push('穿着日常便服');
    if (f.legWear) clothesParts.push(`穿着${f.legWear}`);
    const clothesChinese = clothesParts.join('，');
    
    if (!safeChinese && !clothesChinese) {
        return uni.showToast({ title: '请先选择特征', icon: 'none' });
    }

    uni.showLoading({ title: '分模块组装中...', mask: true });

    try {
        // 【核心逻辑】：一次性翻译三个部分，用 '|||' 分隔，确保格式化
        const prompt = `Translate these 3 parts from Chinese to Danbooru English tags.
        Separate the parts with "|||".
        
        Part 1 (Body): "${safeChinese}"
        Part 2 (NSFW Details): "${nsfwChinese}"
        Part 3 (Clothing): "${clothesChinese}"
        
        Rules:
        1. Use specific tags (e.g. 'sweater', 'plaid skirt', 'pantyhose').
        2. Output ONLY the tags.
        3. Format: Part1Tags ||| Part2Tags ||| Part3Tags`;
        
        const result = await performLlmRequest(prompt);
        
        // 拆解结果
        const parts = result.split('|||');
        const safeTags = parts[0] ? parts[0].trim() : '';
        const nsfwTags = parts[1] ? parts[1].trim() : '';
        const clothingTags = parts[2] ? parts[2].trim() : '';
        
        // 保存分层数据
        // Safe: 风格 + 身体
        formData.value.appearanceSafe = `${faceTags}, ${safeTags}`.replace(/,\s*,/g, ',').trim();
        // NSFW: 隐私部位
        formData.value.appearanceNsfw = nsfwTags;
        // 完整版 (用于预览和头像生成): Safe + (如果选了暴露则加NSFW) + Clothing
        if (f.wearStatus === '暴露/H') {
             formData.value.appearance = `${formData.value.appearanceSafe}, ${nsfwTags}, ${clothingTags}`;
        } else {
             formData.value.appearance = `${formData.value.appearanceSafe}, ${clothingTags}`;
        }

        uni.showToast({ title: 'Prompt 组装完成', icon: 'success' });
    } catch (e) {
        console.error(e);
        // 降级处理：全塞进去
        formData.value.appearance = `${faceTags}, ${safeChinese}, ${nsfwChinese}, ${clothesChinese}`;
        formData.value.appearanceSafe = `${faceTags}, ${safeChinese}`; // 假数据
        uni.showToast({ title: '翻译失败，使用原文', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

const generateUserDescription = async () => {
    const f = formData.value.userFeatures;
    let tags = [];
    if (f.hair) tags.push(f.hair);
    if (f.body) tags.push(f.body);
    if (f.privates) tags.push(`下体${f.privates}`);
    
    const rawKeywords = tags.join('，');
    if (!rawKeywords) return uni.showToast({ title: '请先选择特征', icon: 'none' });

    uni.showLoading({ title: '生成中...', mask: true });

    try {
        const prompt = `Translate to English tags: "${rawKeywords}". Start with "1boy". Output ONLY tags.`;
        const result = await performLlmRequest(prompt);
        formData.value.userAppearance = result;
        uni.showToast({ title: '成功', icon: 'success' });
    } catch (e) {
        formData.value.userAppearance = `1boy, ${rawKeywords}`;
        uni.showToast({ title: e.message || '生成失败', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

const generateImageFromComfyUI = async (promptText, baseUrl) => {
    const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));
    workflow["3"].inputs.text = promptText;
    workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999999);
    try {
        const queueRes = await uni.request({
            url: `${baseUrl}/prompt`, method: 'POST', header: { 'Content-Type': 'application/json' },
            data: { prompt: workflow }, sslVerify: false
        });
        if (queueRes.statusCode !== 200) throw new Error(`队列请求失败: ${queueRes.statusCode}`);
        const promptId = queueRes.data.prompt_id;
        for (let i = 0; i < 60; i++) { 
            await new Promise(r => setTimeout(r, 1000));
            const historyRes = await uni.request({ url: `${baseUrl}/history/${promptId}`, method: 'GET', sslVerify: false });
            if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
                const outputs = historyRes.data[promptId].outputs;
                if (outputs && outputs["16"] && outputs["16"].images.length > 0) {
                    const imgInfo = outputs["16"].images[0];
                    return `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
                }
            }
        }
        throw new Error('生成超时');
    } catch (e) { throw e; }
};

const generateAvatar = async () => {
  if (!formData.value.appearance.trim()) return uni.showToast({ title: '请先生成 Prompt', icon: 'none' });
  const imgConfig = uni.getStorageSync('app_image_config') || {};
  if (!imgConfig.baseUrl) {
      return uni.showToast({ title: '请在[我的]设置中配置 ComfyUI 地址', icon: 'none' });
  }
  uni.showLoading({ title: 'ComfyUI 绘图中...', mask: true });
  // 头像使用完整的 appearance (包含衣服)
  const avatarPrompt = `best quality, masterpiece, anime style, cel shading, solo, cowboy shot, upper body, looking at viewer, ${formData.value.appearance}`;
  
  try {
      const tempUrl = await generateImageFromComfyUI(avatarPrompt, imgConfig.baseUrl);
      if (tempUrl) {
          const saveId = targetId.value || 'temp_create';
          const localPath = await saveToGallery(tempUrl, saveId, formData.value.name || '新角色', avatarPrompt);
          formData.value.avatar = localPath;
          uni.showToast({ title: '成功', icon: 'success' });
      } else { throw new Error("ComfyUI 返回为空"); }
  } catch (e) {
      console.error(e);
      uni.showModal({ title: '错误', content: e.message || '请求异常', showCancel: false });
  } finally { uni.hideLoading(); }
};

const applyTemplate = (key) => {
    const t = PERSONALITY_TEMPLATES[key];
    if (!t) return;
    currentTemplateKey.value = key;
    formData.value.bio = t.bio;
    formData.value.personalityNormal = t.normal;
    formData.value.personalityFlirt = t.flirt;
    formData.value.personalitySex = t.sex;
    formData.value.exampleNormal = t.exNormal;
    formData.value.exampleFlirt = t.exFlirt;
    formData.value.exampleSex = t.exSex;
    uni.showToast({ title: `已应用: ${t.label}`, icon: 'none' });
};

onLoad((options) => {
  const storedWorlds = uni.getStorageSync('app_world_settings');
  if (storedWorlds && Array.isArray(storedWorlds)) worldList.value = storedWorlds;

  if (options.id) {
    isEditMode.value = true;
    targetId.value = options.id;
    loadCharacterData(options.id);
    uni.setNavigationBarTitle({ title: '角色设置' });
  } else {
    activeSections.value.basic = true;
  }
});

const handleWorldChange = (e) => {
    worldIndex.value = e.detail.value;
    if (selectedWorld.value) formData.value.worldId = selectedWorld.value.id;
};

const handleUserWorldChange = (e) => {
    userWorldIndex.value = e.detail.value;
    if (selectedUserWorld.value) formData.value.userWorldId = selectedUserWorld.value.id;
};

const loadCharacterData = (id) => {
  const list = uni.getStorageSync('contact_list') || [];
  const target = list.find(item => String(item.id) === String(id));
  if (target) {
    formData.value.name = target.name;
    formData.value.avatar = target.avatar;
    formData.value.worldId = target.worldId || '';
    formData.value.location = target.location || '';
    formData.value.occupation = target.occupation || (target.settings && target.settings.occupation) || '';

    if (target.settings) {
        formData.value.appearance = target.settings.appearance || '';
        // 【新增】加载分层数据
        formData.value.appearanceSafe = target.settings.appearanceSafe || '';
        formData.value.appearanceNsfw = target.settings.appearanceNsfw || '';
        
        formData.value.faceStyle = target.settings.faceStyle || 'cute';
        formData.value.bio = target.settings.bio || '';
        formData.value.personalityNormal = target.settings.personalityNormal || '';
        formData.value.personalityFlirt = target.settings.personalityFlirt || '';
        formData.value.personalitySex = target.settings.personalitySex || '';
        formData.value.exampleNormal = target.settings.exampleNormal || '';
        formData.value.exampleFlirt = target.settings.exampleFlirt || '';
        formData.value.exampleSex = target.settings.exampleSex || '';
        
        formData.value.userWorldId = target.settings.userWorldId || '';
        formData.value.userLocation = target.settings.userLocation || '';
        formData.value.userOccupation = target.settings.userOccupation || '';
        formData.value.userAppearance = target.settings.userAppearance || '';
        
        if (target.settings.charFeatures) formData.value.charFeatures = { ...formData.value.charFeatures, ...target.settings.charFeatures };
        if (target.settings.userFeatures) formData.value.userFeatures = { ...formData.value.userFeatures, ...target.settings.userFeatures };
    }
    
    if (formData.value.worldId) {
        const idx = worldList.value.findIndex(w => String(w.id) === String(formData.value.worldId));
        if (idx !== -1) worldIndex.value = idx;
    }
    if (formData.value.userWorldId) {
        const uIdx = worldList.value.findIndex(w => String(w.id) === String(formData.value.userWorldId));
        if (uIdx !== -1) userWorldIndex.value = uIdx;
    }

    formData.value.maxReplies = target.maxReplies || 1;
    formData.value.initialAffection = target.initialAffection !== undefined ? target.initialAffection : 10;
    formData.value.initialLust = target.initialLust !== undefined ? target.initialLust : 0;
    
    formData.value.historyLimit = target.historyLimit !== undefined ? target.historyLimit : 20;
    formData.value.enableSummary = target.enableSummary || false;
    formData.value.summaryFrequency = target.summaryFrequency || 20;
    formData.value.summary = target.summary || '';
  }
};

const saveCharacter = () => {
  if (!formData.value.name.trim()) return uni.showToast({ title: '名字不能为空', icon: 'none' });
  let list = uni.getStorageSync('contact_list') || [];
  
  let clothingStr = '便服';
  if (formData.value.charFeatures.clothingStyle) {
      clothingStr = `${formData.value.charFeatures.clothingColor || ''}${formData.value.charFeatures.clothingStyle}`;
  }
  
  const charData = {
    name: formData.value.name,
    avatar: formData.value.avatar || '/static/ai-avatar.png',
    maxReplies: formData.value.maxReplies,
    initialAffection: formData.value.initialAffection,
    initialLust: formData.value.initialLust, 
    
    historyLimit: formData.value.historyLimit, 
    enableSummary: formData.value.enableSummary,
    summaryFrequency: formData.value.summaryFrequency,
    summary: formData.value.summary,
    
    location: formData.value.location,
    clothing: clothingStr, 
    worldId: formData.value.worldId, 
    occupation: formData.value.occupation,

    settings: {
        appearance: formData.value.appearance, 
        // 【关键保存】：保存 Safe 和 NSFW 分层数据
        appearanceSafe: formData.value.appearanceSafe,
        appearanceNsfw: formData.value.appearanceNsfw,
        
        faceStyle: formData.value.faceStyle,
        charFeatures: formData.value.charFeatures, 
        
        bio: formData.value.bio,
        occupation: formData.value.occupation, 
        
        userWorldId: formData.value.userWorldId,
        userLocation: formData.value.userLocation,
        userOccupation: formData.value.userOccupation,
        userAppearance: formData.value.userAppearance, 
        userFeatures: formData.value.userFeatures,

        personalityNormal: formData.value.personalityNormal,
        personalityFlirt: formData.value.personalityFlirt,
        personalitySex: formData.value.personalitySex,
        
        exampleNormal: formData.value.exampleNormal,
        exampleFlirt: formData.value.exampleFlirt,
        exampleSex: formData.value.exampleSex,
    },
    
    lastMsg: isEditMode.value ? undefined : '新角色已创建', 
    lastTime: isEditMode.value ? undefined : '刚刚',
    unread: isEditMode.value ? undefined : 0
  };

  if (isEditMode.value) {
    const index = list.findIndex(item => String(item.id) === String(targetId.value));
    if (index !== -1) {
        list[index] = { ...list[index], ...charData };
        list[index].affection = formData.value.initialAffection;
        uni.showToast({ title: '修改已保存', icon: 'success' });
    }
  } else {
    const newChar = { 
        id: Date.now(), 
        ...charData, 
        affection: formData.value.initialAffection, 
        lust: formData.value.initialLust, 
        lastTimeTimestamp: Date.now(), 
        unread: 0 
    };
    list.unshift(newChar);
    uni.showToast({ title: '创建成功', icon: 'success' });
  }
  uni.setStorageSync('contact_list', list);
  setTimeout(() => { uni.navigateBack(); }, 800);
};

const clearHistoryAndReset = () => {
  uni.showModal({
    title: '彻底重置', 
    content: `将清空聊天记录、重置好感度、欲望值、位置、活动状态。确定吗？`, 
    confirmColor: '#ff4757',
    success: (res) => {
      if (res.confirm && targetId.value) {
        uni.removeStorageSync(`chat_history_${targetId.value}`);
        let list = uni.getStorageSync('contact_list') || [];
        const index = list.findIndex(item => String(item.id) === String(targetId.value));
        
        if (index !== -1) {
          let clothingStr = '便服';
          if (formData.value.charFeatures.clothingStyle) {
              clothingStr = `${formData.value.charFeatures.clothingColor || ''}${formData.value.charFeatures.clothingStyle}`;
          }

          const resetData = {
              lastMsg: '（记忆已清除）',
              lastTime: '刚刚',
              lastTimeTimestamp: Date.now(),
              summary: '', 
              currentLocation: formData.value.location || '角色家',
              interactionMode: 'phone',
              lastActivity: '自由活动', 
              affection: formData.value.initialAffection || 10,
              lust: formData.value.initialLust || 0, 
              clothing: clothingStr 
          };
          list[index] = { ...list[index], ...resetData };
          uni.setStorageSync('contact_list', list);
          uni.showToast({ title: '重置成功', icon: 'success' });
          setTimeout(() => {
              uni.navigateBack();
          }, 800);
        } else {
            uni.showToast({ title: '未找到角色数据', icon: 'none' });
        }
      }
    }
  });
};
</script>

<style lang="scss">
/* 关键修复：确保容器占满屏幕，禁止 Body 滚动 */
.create-container { 
    height: 100vh; 
    display: flex; 
    flex-direction: column; 
    background-color: #f5f7fa; 
    overflow: hidden; 
}

/* 关键修复：Scroll View 必须指定 flex-grow 和 height: 0 来触发 Flex 计算 */
.form-scroll { 
    flex: 1; 
    height: 0; 
    width: 100%;
}

.form-section { background-color: #fff; margin-top: 24rpx; overflow: hidden; }
.section-header { padding: 30rpx; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f9f9f9; }
.section-header:active { background-color: #f9f9f9; }
.section-title-wrapper { display: flex; flex-direction: column; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; border-left: 8rpx solid #007aff; padding-left: 20rpx; }
.section-subtitle { font-size: 22rpx; color: #999; margin-left: 28rpx; margin-top: 8rpx; }
.arrow-icon { color: #ccc; font-size: 24rpx; }
.section-content { padding: 30rpx; animation: slideDown 0.2s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10rpx); } to { opacity: 1; transform: translateY(0); } }

/* 子板块样式 */
.sub-group { border: 2rpx dashed #eee; border-radius: 12rpx; margin-bottom: 24rpx; background-color: #fcfcfc; overflow: hidden; }
.sub-header { padding: 20rpx; display: flex; justify-content: space-between; align-items: center; background-color: #fafafa; border-bottom: 1px solid #eee; }
.sub-title { font-size: 26rpx; font-weight: bold; color: #555; }
.sub-arrow { font-size: 22rpx; color: #ccc; }
.sub-content { padding: 20rpx; }

/* 分类块样式 */
.category-block { margin-bottom: 30rpx; border-bottom: 1px solid #f0f0f0; padding-bottom: 20rpx; }
.category-block:last-child { border-bottom: none; }
.block-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; display: block; border-left: 6rpx solid #ffd700; padding-left: 12rpx; background-color: #fff9e6; padding-top: 4rpx; padding-bottom: 4rpx; }

/* 特征行样式 */
.feature-row { margin-bottom: 20rpx; display: flex; flex-direction: column; }
.feat-label { font-size: 24rpx; color: #888; margin-bottom: 10rpx; }
.chips-scroll { white-space: nowrap; width: 100%; }
.chips-flex { display: flex; gap: 12rpx; padding-bottom: 4rpx; align-items: center; }
.chip { display: inline-block; padding: 10rpx 24rpx; background-color: #fff; border: 1px solid #ddd; border-radius: 8rpx; font-size: 24rpx; color: #555; transition: all 0.2s; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.02); }
.chip.active { background-color: #e3f2fd; color: #007aff; border-color: #007aff; font-weight: bold; box-shadow: 0 2rpx 6rpx rgba(0,122,255,0.2); }
.chip-warn.active { background-color: #ffebee; color: #d32f2f; border-color: #d32f2f; }
.style-chip { padding: 12rpx 20rpx; }
.separator { color: #ddd; font-size: 20rpx; margin: 0 4rpx; }

.mini-btn-gen { background-color: #333; color: #fff; font-size: 24rpx; margin-top: 20rpx; border-radius: 40rpx; }

.input-item, .textarea-item { margin-bottom: 30rpx; }
.label { display: block; font-size: 28rpx; color: #666; margin-bottom: 16rpx; }
.label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.gen-btn { background-color: #007aff; color: #fff; font-size: 24rpx; padding: 6rpx 20rpx; border-radius: 30rpx; }
.input { background-color: #f8f8f8; height: 80rpx; padding: 0 20rpx; border-radius: 10rpx; font-size: 30rpx; }
.picker-box { background-color: #f8f8f8; height: 80rpx; padding: 0 20rpx; border-radius: 10rpx; font-size: 30rpx; line-height: 80rpx; color: #333; }
.quick-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.tag { background-color: #e3f2fd; color: #007aff; padding: 8rpx 20rpx; border-radius: 30rpx; font-size: 24rpx; border: 1px solid transparent; }
.tag:active { background-color: #bbdefb; transform: scale(0.95); }
.job-tag { background-color: #f3e5f5; color: #9c27b0; }
.textarea { background-color: #f8f8f8; width: 100%; padding: 20rpx; border-radius: 10rpx; font-size: 30rpx; height: 160rpx; box-sizing: border-box; }
.textarea.large { height: 240rpx; }
.memory-box { border: 2rpx dashed #9b59b6; background-color: #fdfaff; color: #555; line-height: 1.6; }
.tip { font-size: 24rpx; color: #999; margin-top: 10rpx; display: block; line-height: 1.5; }
.setting-tip { font-size: 24rpx; color: #999; margin-bottom: 20rpx; background: #f0f9eb; padding: 10rpx; border-radius: 8rpx; color: #2ecc71; }
.avatar-preview-box { margin-top: 20rpx; display: flex; justify-content: center; }
.avatar-preview { width: 160rpx; height: 160rpx; border-radius: 20rpx; border: 2px solid #eee; background: #fff; }
.avatar-placeholder { width: 160rpx; height: 160rpx; border-radius: 20rpx; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 2px dashed #ccc; }
.avatar-emoji { font-size: 60rpx; }
.bottom-area { padding: 20rpx 30rpx; background-color: #fff; border-top: 1px solid #eee; padding-bottom: calc(20rpx + constant(safe-area-inset-bottom)); padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); }
.save-btn { background-color: #007aff; color: #fff; border-radius: 40rpx; font-size: 32rpx; }
.clear-btn { background-color: #fff0f1; color: #ff4757; font-size: 30rpx; border: 1px solid #ffcccc; width: 100%; }
.slider-header { display: flex; justify-content: space-between; align-items: center; }

/* 迷你风格卡片 */
.style-mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-bottom: 20rpx; }
.style-mini-card { background: #fff; border: 1px solid #eee; border-radius: 8rpx; padding: 12rpx 0; text-align: center; font-size: 22rpx; color: #666; }
.style-mini-card.active { border-color: #e67e22; background-color: #fff3e0; color: #d35400; font-weight: bold; }

/* 【新增】模板选择器样式 */
.template-selector {
    background-color: #fff9e6;
    padding: 24rpx;
    border-radius: 16rpx;
    border: 1px solid #ffe0b2;
    margin-bottom: 30rpx;
}
.template-chip {
    padding: 12rpx 24rpx;
    background-color: #fff;
    border: 2rpx solid #ffe0b2;
    margin-right: 16rpx;
    border-radius: 40rpx;
    font-size: 24rpx;
    font-weight: bold;
    color: #f57c00;
}
.template-chip.active {
    background-color: #ff9800;
    color: #fff;
    border-color: #f57c00;
    box-shadow: 0 4rpx 8rpx rgba(245, 124, 0, 0.3);
}
.template-desc {
    font-size: 24rpx;
    color: #e65100;
    margin-top: 20rpx;
    font-style: italic;
    padding-left: 10rpx;
}

/* 分割线 */
.divider { height: 1px; background-color: #eee; margin: 30rpx 0; }

/* 阶段卡片样式 */
.stage-container { display: flex; flex-direction: column; gap: 24rpx; }
.stage-card {
    border-radius: 16rpx;
    overflow: hidden;
    border: 1px solid #eee;
}
.stage-card.gray { background-color: #fafafa; border-color: #e0e0e0; }
.stage-card.pink { background-color: #fff0f5; border-color: #f8bbd0; }
.stage-card.red { background-color: #ffebee; border-color: #ffcdd2; }

.stage-header {
    padding: 16rpx 24rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    font-size: 26rpx;
}
.stage-card.gray .stage-header { background-color: #eeeeee; color: #616161; }
.stage-card.pink .stage-header { background-color: #fce4ec; color: #c2185b; }
.stage-card.red .stage-header { background-color: #ffcdd2; color: #c62828; }

.stage-body { padding: 20rpx; }

.input-row { margin-bottom: 20rpx; }
.input-row:last-child { margin-bottom: 0; }

.sub-label {
    font-size: 22rpx;
    color: #666;
    margin-bottom: 8rpx;
    display: block;
}

.mini-textarea {
    width: 100%;
    height: 100rpx;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 8rpx;
    padding: 12rpx;
    font-size: 24rpx;
    box-sizing: border-box;
}
.mini-textarea.bubble {
    background-color: #fff;
    border: 1px solid #ddd;
    border-left: 6rpx solid #aaa; /* 对话框左侧加粗，区分 */
}
.stage-card.pink .mini-textarea.bubble { border-left-color: #ec407a; }
.stage-card.red .mini-textarea.bubble { border-left-color: #d32f2f; }
</style>