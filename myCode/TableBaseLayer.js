/**
 * phz 底层牌桌
 */

loadSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/TableLayer/TableBaseLayer', function () {
  let GameConfig = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/phzGameRes')
  let BaseLayer = include('Eos/Base/BaseLayer')
  let GameUtil = include('Game/GameUtil')
  let GameType = include('Game/Config/GameType')
  let Pub = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/phzPublicFunc')
  let WaitLayer = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/TableLayer/WaitLayer')
  let PlayerHeadLayer = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/TableLayer/PlayerHeadLayer')
  let PHZCardsBaseLayer = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/TableLayer/PHZCardsBaseLayer')
  let EatActionsLayer = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/TableLayer/EatActionLayer')
  let ChatConfig = include('Game/Chat/ChatConfig')
  let ChatLayer = include('Game/Chat/ChatLayer')
  let VoiceRecordLayer = include('Game/Chat/VoiceRecordLayer')
  let ChatUtils = include('Game/Chat/ChatUtils')
  let PlayTypeDescLayer = include('Game/Hall/PlayTypeDescLayer')

  // let ruleTxtColor = ['6e5841', '174b2b', '6e5841', '044a3f', '1a4654']

  let TableBaseLayer = BaseLayer.extend({
    _className: 'phzTableBaseLayer',

    ctor: function () {
      this._super(GameConfig.Csb.TableBaseLayer)

      this.currTimeDt = 1
      this.tableSkinIndex = 1
      this.isReplay = !!(appInstance.dataManager().getPlayData().tableData.isReplay)
      this.cardArray = []
      this.selfUId = appInstance.dataManager().selfUid()
      this.tableId = 0

      this.delRoomLayer = null
      this._playTypeDescLayer = null
      this.msgLog = []

      this.initPlayUI()
      this.initAllEvent()
    },

    LOAD_RES_CONFIG: {
      value: [GameConfig.Atlas.phzBtn, GameConfig.Atlas.TableBase, GameConfig.Atlas.phzCards,
        GameConfig.Atlas.phzHead, GameConfig.Atlas.phzSetting
      ]
    },

    onEnter: function () {
      this._super()

      this.scheduleUpdate()
      this.initNodeInfo()
      this.initVoice()
      this.updateBoxCardsVisible()
      this.updateResidueCards(true)
      if (!this.isReplay) {
        this.checkDelRoomShow()
        // 清除聊天数据
      }
      ChatUtils.cleanChatListIfNeed()
      // this.checkPlaybackUiShow()

      this.cardNumAtlas.ignoreContentAdaptWithSize(true)
    },

    onExit: function () {
      for (let eventName in this.eventList) {
        this.unRegisterEventListener(eventName)
      }
      this._super()
    },

    RES_BINDING: function () {
      return {
        'back': { name: 'backBg' },
        'yuan': { name: 'backYuan' },
        'version': { name: 'version' },
        'time': { name: 'textTime' },
        'titleBg/tableid': { name: 'tableIdTxt' },
        'titleBg/roundnumAtlas': { name: 'roundnumAtlas' },
        'titleBg/roundnumText': { name: 'roundnumText' },
        'sign': { name: 'signPng' },
        'box': { name: 'boxCards' },
        'box/cardnumbg': { name: 'cardNumBg' },
        'box/cardnumAtlas': { name: 'cardNumAtlas' },
        'box/card': { name: 'cardPng' },
        'change_classic': { name: 'changeClassic', onClicked: this.clickChangeClassicBtn },
        'position': { name: 'position', onClicked: this.clickPositionBtn },
        'restart': { name: 'restart', onClicked: this.clickRestartBtn },
        'playTypeBtn': { onClicked: this.clickPlayTypeBtn },
        'voice_btn': { name: 'voiceBtn' },
        'chat_btn': { name: 'chatBtn', onClicked: this.clickChatBtn },
        'powerWifiBg/powerBar': { name: 'powerBar' },
        'powerWifiBg/wifi': { name: 'wifi' },
        'powerWifiBg/bg/delayValue': { name: 'delayValue' }
      }
    },

    //  以下是打牌消息处理
    initAllEvent: function () {
      let eventList = {
        'nativePower': this.onEventNativePower,
        'pingPong': this.updateSignalInfo,
        'MJChat': this.handleChatMsg,
        'playVoice': this.handleVoiceMsg,
        'UseProp': this.handleUseProp,

        'removePlayer': this.removePlayer,
        'addPlayer': this.addPlayer,
        'mjhand': this.mjhand,
        'MJPass': this.MJPass,
        'MJPut': this.MJPut,
        'PickCard': this.PickCard,
        'addCard': this.addCard,
        'refreshNum': this.residueCards,
        'newCard': this.newCard,
        'MJChi': this.MJChi,
        'MJPeng': this.MJPeng,
        'MJGang': this.MJGang,
        'roundEnd': this.roundEnd,
        'endRoom': this.endRoom,
        'onlinePlayer': this.onlinePlayer,
        'MJTick': this.MJTick,
        'DelRoom': this.DelRoom,
        'MJPassHu': this.MJPassHu,
        'onUserReady': this.onUserReady
      }

      // eventList[Pub.EventName.ClearTable] = this.onEventClearCardUI
      eventList[Pub.EventName.ChangeCardSize] = this.onEventChangeCardSize
      eventList[Pub.EventName.ChangeCardFace] = this.onEventChangeCardFace
      eventList[Pub.EventName.ChangShowTingTips] = this.onEventChangShowTingTips

      this.eventList = eventList
      for (let eventKey in eventList) {
        this.registerEventListener(eventKey, eventList[eventKey])
      }
    },

    onEventNativePower: function (d) {
      if (d < 20) {
        this.powerBar.loadTexture('phzdesk_pz_power6.png', ccui.Widget.PLIST_TEXTURE)
      } else if (d >= 20 && d <= 40) {
        this.powerBar.loadTexture('phzdesk_pz_power4.png', ccui.Widget.PLIST_TEXTURE)
      } else {
        this.powerBar.loadTexture('phzdesk_pz_power2.png', ccui.Widget.PLIST_TEXTURE)
      }
      this.powerBar.setPercent(Number(d))
    },

    initPlayUI: function () {
      try {
        // 打牌
        this.cardsLayer = new PHZCardsBaseLayer(this.isReplay, this.selfUId)
        this.addChild(this.cardsLayer)
        // 头像
        this.PlayerHeadLayer = new PlayerHeadLayer(this.isReplay, this.selfUId)
        this.addChild(this.PlayerHeadLayer, 1)

        // 回放不需要加载的ui
        if (!this.isReplay) {
          // 准备
          this.waitLayer = new WaitLayer()
          this.addChild(this.waitLayer, 10)

          // 菜单
          let ResourceConfig = include('Game/ResourceConfig')
          let menuClass = include(ResourceConfig.Module.GameMenuUI)
          this.GameMenuLayer = appInstance.uiManager().createUI(menuClass, ResourceConfig.Csb.GameMenuUI)
          this.addChild(this.GameMenuLayer, 3)

          // 吃碰
          this.eatActionLayer = new EatActionsLayer(this.selfUId)
          this.addChild(this.eatActionLayer, 2)
        } else {
          let layer = appInstance.uiManager().createUI(includeSubModule(GameConfig.Module.ReplayCtrlLayer), this)
          this.addChild(layer)
          this.restart.setVisible(false)
          this.position.setVisible(false)
          this.changeClassic.setVisible(false)
          this.voiceBtn.setVisible(false)
          this.chatBtn.setVisible(false)
        }
      } catch (e) {
        cc.error('Tablebase add layer error %s  Stack:', e, e.stack)
      }
    },

    clickChangeClassicBtn: function () {
      this.tableSkinIndex = this.tableSkinIndex - 1
      this.tableSkinIndex = (this.tableSkinIndex + 1) % 4
      this.tableSkinIndex = this.tableSkinIndex + 1
      utils.localStorage.setNumberForKey('phzDeskIndex', this.tableSkinIndex)
      this.refreshTableSkin()
    },

    clickRestartBtn: function (node) {
      utils.alertMsg('确定要重启游戏么？', function () {
        appInstance.restartGame()
      }, function () {
      })
    },

    clickPlayTypeBtn: function () {
      if (!this._playTypeDescLayer) {
        this._playTypeDescLayer = appInstance.uiManager().createUI(PlayTypeDescLayer)
        this._playTypeDescLayer.adjustWidgetPos(0.58)
        let pos = this.playTypeBtn.getPosition()
        let size = this.playTypeBtn.getContentSize()
        appInstance.sceneManager().getCurScene().addChild(this._playTypeDescLayer, 1)
        let scale = appInstance.display().gDesignScale()
        scale = Math.min(scale.scaleX, scale.scaleY)
        this._playTypeDescLayer.adjustDescViewPos(cc.p(pos.x - 5, pos.y - (size.height / 2) * scale - 13))
      }
      this._playTypeDescLayer.showDesc()
    },

    clickPositionBtn: function () {
      let posLayer = appInstance.uiManager().getUIByName('UserPosition')
      if (!posLayer) {
        let positionClass = include('Game/Hall/UserPositionLayer')
        posLayer = appInstance.uiManager().createUI(positionClass)
        appInstance.sceneManager().getCurScene().addChild(posLayer)
      }
      posLayer.setVisible(true)
    },

    clickChatBtn: function () {
      let chatLayer = appInstance.uiManager().createUI(ChatLayer, ChatConfig.Emoji.common, ChatConfig.Msg.phz)
      appInstance.sceneManager().getCurScene().addChild(chatLayer)
    },

    initNodeInfo: function () {
      let sData = appInstance.dataManager().getPlayData()
      let tData = sData.tableData

      this.tableId = tData.tableid
      this.tableIdTxt.setString(tData.tableid)

      this.tableSkinIndex = utils.localStorage.getNumberForKey('phzDeskIndex', this.tableSkinIndex) || 1
      cc.log('this.tableSkinIndex' + this.tableSkinIndex)
      this.signPng.setSpriteFrame('phz_desk_sign_' + tData.huziType + '.png')
      this.refreshTableSkin()
      this.version.setString(GameUtil.getGameVersion(GameType.GameID.PHZ))

      // this.initRuleTxt()
      this.updateTime()
      appInstance.nativeApi().NativeBattery()

      this.delayValue.setString(Math.floor(appInstance.gameNet().reqPingPong[0]) + 'ms')
      this.cardPng.setVisible(false)

      this.roundnumAtlas.ignoreContentAdaptWithSize(true)
      this.roundNum()
    },

    initVoice: function () {
      if (!this.isReplay) {
        let recordLayer = appInstance.uiManager().createUI(VoiceRecordLayer)
        this.addChild(recordLayer, 4)
        recordLayer.addVoiceBtnTouchListener(this.voiceBtn)
      }
    },

    updateResidueCards: function (isInit) {
      let sData = appInstance.dataManager().getPlayData()
      let tData = sData.tableData

      let leftCardNum = Pub.getTotalNum() - tData.cardNext // 剩余的个数
      let curSurplusNum = this.cardArray.length
      let diff = curSurplusNum - leftCardNum
      let count = 0
      let parent = this.cardPng.getParent()
      if (diff >= 0 && curSurplusNum > 0) {
        for (; count < diff; count++) {
          let popCard = this.cardArray.pop()
          popCard.removeFromParent()
        }
      } else {
        let showCardNum = 20
        let pos = this.cardPng.getPosition()
        let height = this.cardPng.getBoundingBox().height / 20
        count = curSurplusNum
        for (; count < showCardNum; count++) {
          let newCard = this.cardPng.clone()
          newCard.visible = true
          parent.addChild(newCard)
          newCard.setPosition(pos.x, pos.y + count * height)
          this.cardArray.push(newCard)
        }
        if (count > curSurplusNum) {
          for (let i = curSurplusNum; i < count; ++i) {
            this.cardArray[i].loadTexture('phzdesk_card.png', ccui.Widget.PLIST_TEXTURE)
          }
        }
      }

      this.cardNumAtlas.setString(leftCardNum)
      this.cardNumAtlas.setLocalZOrder(10)
      this.cardNumBg.setLocalZOrder(10)
    },

    updateBoxCardsVisible: function () {
      let sData = appInstance.dataManager().getPlayData()
      let tData = sData.tableData
      if (tData.tState === Pub.TableState.waitJoin ||
        tData.tState === Pub.TableState.waitReady || tData.tState === Pub.TableState.isReady) {
        this.boxCards.setVisible(false)
      } else {
        this.boxCards.setVisible(true)
      }
    },

    refreshTableSkin: function () {
      let index = this.tableSkinIndex
      cc.log('refreshTableSkin' + GameConfig.PrefixPath.resPath + 'desktop/Z_backgroud_' + (index - 1) + '.jpg')
      this.backBg.loadTexture(GameConfig.PrefixPath.resPath + 'desktop/Z_backgroud_' + (index - 1) + '.jpg')
      this.backYuan.loadTexture('phz_desk_desk_yuan_' + ((index - 1) % 2) + '.png', ccui.Widget.PLIST_TEXTURE)
    },

    roundNum: function () {
      let sData = appInstance.dataManager().getPlayData()
      let tData = sData.tableData

      if (tData.byEndRoom) {
        return
      }

      switch (tData.huziType) {
        case Pub.HUZITYPE.SYBP:
        case Pub.HUZITYPE.LD:
        case Pub.HUZITYPE.XX: {
          this.roundnumText.loadTexture('phzdesk_pz_46.png', ccui.Widget.PLIST_TEXTURE)
          this.roundnumAtlas.setString(tData.roundAll - tData.roundNum + 1)
          break
        }
        default: {
          this.roundnumText.loadTexture('phzdesk_pz_68.png', ccui.Widget.PLIST_TEXTURE)
          this.roundnumAtlas.setString(tData.roundNum - 1)
          break
        }
      }
    },

    updateTime: function () {
      let date = utils.timeUtil.getDateFromTime()
      this.textTime.setString(utils.timeUtil.getDateDayStr(date, '.') + ' ' + utils.timeUtil.getDateHourStr(date, ':', true))
    },

    onUpdate: function (dt) {
      this.currTimeDt = this.currTimeDt - dt
      if (this.currTimeDt <= 0) {
        this.updateTime()
        this.currTimeDt = 1
      }
    },

    updateSignalInfo: function (d) {
      let ms = d / 1000.0
      this.delayValue.setString(Math.floor(d) + 'ms')
      if (ms < 0.3) {
        this.wifi.loadTexture('phzdesk_Z_wifi_4.png', ccui.Widget.PLIST_TEXTURE)
      } else if (ms < 0.6) {
        this.wifi.loadTexture('phzdesk_Z_wifi_3.png', ccui.Widget.PLIST_TEXTURE)
      } else if (ms < 1) {
        this.wifi.loadTexture('phzdesk_Z_wifi_2.png', ccui.Widget.PLIST_TEXTURE)
      } else {
        this.wifi.loadTexture('phzdesk_Z_wifi_1.png', ccui.Widget.PLIST_TEXTURE)
      }
    },

    onEventClearCardUI: function () {
      this.msgLog.push('ClearCardUI')
      this.msgLog.push(Date.now() + '')
      if (this.isReplay) {
        return
      }
      this.cardsLayer.clearLayerCardUI()
      this.boxCards.setVisible(false)
    },

    checkHandCardsCount: function () {
      // 牌的数据异常检测
      try {
        let sData = appInstance.dataManager().getPlayData()
        let pl = sData.players[this.selfUId]
        let mjhand = pl.mjhand || []
        let uiCount = this.cardsLayer.getSelfHandCardsCount()
        // cc.log('checkHandCardsCount =============== ' + mjhand.length)
        if (uiCount === 0 && mjhand.length !== 0) {
          Pub.refreshInitScene()
          Pub.reportErrorTableData('Tablebase checkHandCardsCount uid = ' + this.selfUId + 'ui cards = ' + uiCount + ' msg log = ' + JSON.stringify(this.msgLog) + '   ')
        }
      } catch (e) {
        Pub.refreshInitScene()
        Pub.reportErrorTableData('Tablebase checkHandCardsCount uid = ' + this.selfUId + '  msg log = ' + JSON.stringify(this.msgLog) + '   ')
      }
    },

    // 牌桌UI清屏(以能直接看到牌桌手牌状态为标准)
    clearTableView: function () {
      if (this.isReplay) {
        return
      }
      let delList = ['UserPosition', 'ChatLayer', 'GameSettingLayer', 'TextViewLayer', 'PersonInfo'] // 需要直接删除的ui

      this.GameMenuLayer.hideMenu()
      if (this._playTypeDescLayer) {
        this._playTypeDescLayer.hideDesc()
      }

      for (let i = 0; i < delList.length; i++) {
        let ui = appInstance.uiManager().getUIByName(delList[i])
        if (ui) {
          appInstance.uiManager().removeUI(ui)
        }
      }
    },

    onEventChangeCardSize: function () {
      this.cardsLayer.onChangeCardSize()
    },

    onEventChangeCardFace: function () {
      this.cardsLayer.onChangeCardFace()
    },

    onEventChangShowTingTips: function () {
      this.cardsLayer.onChangShowTingTips()
    },

    checkDelRoomShow: function () {
      let sData = appInstance.dataManager().getPlayData()
      let tData = sData.tableData
      if (!cc.isUndefined(tData.firstDel) && tData.firstDel !== 0) {
        if (!this.delRoomLayer) {
          let ResourceConfig = include('Game/ResourceConfig')
          let DeleteRoomLayer = include(ResourceConfig.Module.DeleteRoom)
          this.delRoomLayer = appInstance.uiManager().createUI(DeleteRoomLayer, ResourceConfig.Csb.DeleteRoom)
          appInstance.sceneManager().getCurScene().addChild(this.delRoomLayer, 999)
        }
      }
    },

    // 申请解散房间
    onDeleteRoom: function (msg) {
      if (!this.delRoomLayer) {
        let ResourceConfig = include('Game/ResourceConfig')
        let DeleteRoomLayer = include(ResourceConfig.Module.DeleteRoom)
        this.delRoomLayer = appInstance.uiManager().createUI(DeleteRoomLayer, ResourceConfig.Csb.DeleteRoom)
        appInstance.sceneManager().getCurScene().addChild(this.delRoomLayer, 999)
      } else {
        if (msg.nouid && msg.nouid.length > 0) {
          appInstance.uiManager().removeUI(this.delRoomLayer)
          this.delRoomLayer = null
          let msgText = '玩家 ' + appInstance.dataManager().getPlayerNames(msg.nouid) + ' 不同意解散房间'
          appInstance.uiManager().popSystemMessage(msgText)
        } else {
          this.delRoomLayer.updatePlayersStatus()
        }
      }
    },

    handleChatMsg: function (chatMsg) {
      this.PlayerHeadLayer.handleChatMsg(chatMsg)
    },

    handleVoiceMsg: function (voiceMsg) {
      this.PlayerHeadLayer.handleVoiceMsg(voiceMsg)
    },

    handleUseProp: function (msg) {
      this.PlayerHeadLayer.onUseProp(msg)
    },

    // 关闭牌桌
    onEndRoom: function (msg) {
      if (msg.yesuid) {
        let uidLen = msg.yesuid.length
        for (let i = 0; i < uidLen; i++) {
          let pl = appInstance.dataManager().getPlayerByUid(msg.yesuid[i])
          if (pl) {
            pl.delRoom = 1
          }
        }
      }
      if (this.delRoomLayer) {
        appInstance.uiManager().removeUI(this.delRoomLayer)
        this.delRoomLayer = null
      }
      let ResourceConfig = include('Game/ResourceConfig')
      let EndRoomLayer = include(ResourceConfig.Module.EndRoomsUI)
      let endRoomLayer = appInstance.uiManager().createUI(EndRoomLayer, ResourceConfig.Csb.EndRoomsUI, msg)
      appInstance.sceneManager().getCurScene().addChild(endRoomLayer)
      if (msg.showEnd && !this.isReplay) {
        let endAllLayerClass = includeSubModule(GameConfig.Module.EndAllsUI)
        let endAllLayer = appInstance.uiManager().createUI(endAllLayerClass, GameConfig.Csb.EndAllsUI)
        appInstance.sceneManager().getCurScene().addChild(endAllLayer)
      }
    },

    removePlayer: function (d) {
      this.PlayerHeadLayer.removePlayer(d)
      if (appInstance.dataManager().isGuildTable()) {
        this.waitLayer.updateReady()
      }
    },

    addPlayer: function (d) {
      this.PlayerHeadLayer.addplayer(d)
      this.cardsLayer.mapUidOff()
    },

    mjhand: function (d) {
      try {
        this.msgLog.push('mjhand' + Date.now())
        this.cardsLayer.updateHandCards()
        this.PlayerHeadLayer.updatePlayerMjHand()
        this.updateBoxCardsVisible()
        this.roundNum()

        if (!this.isReplay) {
          this.waitLayer.hideButtons()
          // 牌的数据异常检测
          let errorFlag = true
          let uiCount = this.cardsLayer.getSelfHandCardsCount()
          if (this.msgLog.indexOf('ClearCardUI') === -1 && this.msgLog.indexOf('roundEnd') >= 0) {
            Pub.reportErrorTableData('TablebaseMJHand not Clear uid = ' + this.selfUId + 'ui cards = ' + uiCount + ' msg log = ' + JSON.stringify(this.msgLog) + '   ')
          }

          if (uiCount > 0) {
            errorFlag = false
          }

          if (errorFlag) {
            Pub.refreshInitScene()
            Pub.reportErrorTableData('TablebaseMJHand uid = ' + this.selfUId + 'ui cards = ' + uiCount + ' msg log = ' + JSON.stringify(this.msgLog) + '   ')
          }
        }
      } catch (e) {
        Pub.refreshInitScene()
        Pub.reportErrorTableData('TablebaseMjhand2 uid = ' + this.selfUId + ' msg log = ' + JSON.stringify(this.msgLog) + '   ')
      }
    },

    MJPass: function (d) {
      if (!this.isReplay) {
        this.eatActionLayer.checkEatVisible()
        this.cardsLayer.updateTingCards()
      } else {
        this.PlayerHeadLayer.handlePassMsg(d)
      }
    },

    PickCard: function (d) {
      this.msgLog.push('PickCard')
      this.cardsLayer.pickCard(d)
    },

    addCard: function (d) {
      this.msgLog.push('addCard')
      this.cardsLayer.addCard(d)
    },

    residueCards: function () {
      this.msgLog.push('residueCards')
      this.updateResidueCards()
    },

    newCard: function (d) {
      this.msgLog.push('newCard')
      if (!this.isReplay) {
        // 牌的数据异常检测
        let errorFlag = true
        let uiCount = this.cardsLayer.getSelfHandCardsCount()
        if (d.cardNums && d.cardNums[this.selfUId]) {
          let cardNum = d.cardNums[this.selfUId]
          if (cardNum > 0 && cardNum === uiCount) {
            errorFlag = false
          }
        }
        if (errorFlag) {
          Pub.refreshInitScene()
          Pub.reportErrorTableData('TablebaseNewCard uid = ' + this.selfUId + 'ui cards = ' + uiCount + ' msg log = ' + JSON.stringify(this.msgLog) + '   ')
        }

        this.eatActionLayer.checkEatVisible()
        this.cardsLayer.updateTingCards()
        this.cardsLayer.showPutCardTips()
      }

      this.cardsLayer.newCardsUpdate(d.uid, d.lastPut, d.putType)
      this.PlayerHeadLayer.updatePlayerEffect()
      this.updateResidueCards()
    },

    MJPut: function (d) {
      this.msgLog.push('MJPut')

      if (!this.isReplay) {
        // this.checkHandCardsCount()
        this.eatActionLayer.checkEatVisible()
      } else {
        this.cardsLayer.onMjPut(d.uid, d.card, d.putType)
      }
      this.cardsLayer.newCardsUpdate(d.uid, d.card, d.putType)
    },

    MJChi: function (d) {
      this.msgLog.push('MJChi')
      if (!this.isReplay) {
        // this.checkHandCardsCount()
        this.eatActionLayer.hideEatLayertButtons()
        this.cardsLayer.updateTingCards()
        this.cardsLayer.showPutCardTips()
      }
      this.cardsLayer.onChiMsg(d)
      this.PlayerHeadLayer.updatePlayerEffect()
      this.PlayerHeadLayer.updatePlayerScore(true)
    },

    MJPeng: function (d) {
      this.msgLog.push('MJPeng')
      if (!this.isReplay) {
        // this.checkHandCardsCount()
        this.eatActionLayer.hideEatLayertButtons()
        this.cardsLayer.updateTingCards()
        this.cardsLayer.showPutCardTips()
      }
      this.cardsLayer.onPengMsg(d)
      this.PlayerHeadLayer.updatePlayerEffect()
      this.PlayerHeadLayer.updatePlayerScore(true)
    },

    MJGang: function (d) {
      this.msgLog.push('MJGang')
      if (!this.isReplay) {
        // this.checkHandCardsCount()
        this.eatActionLayer.checkEatVisible()
        this.cardsLayer.updateTingCards()
        this.cardsLayer.showPutCardTips()
      }
      this.PlayerHeadLayer.updatePlayerEffect()
      this.PlayerHeadLayer.updatePlayerScore(true)

      if (d.gang === 1) {
        this.cardsLayer.onAnPengMsg(d)
      } else if (d.gang === 2) {
        // 碰加模
        this.cardsLayer.onGangMsg(d)
      } else if (d.gang === 3) {
        // 自摸 + 偎
        this.cardsLayer.onAnGangMsg(d)
      } else if (d.gang === 4) {
        // 三张手牌+非自摸
        this.cardsLayer.onGangMsg(d)
      } else if (d.gang === 5) {
        // 自摸+3张手牌
        this.cardsLayer.onAnGangMsg(d)
      } else if (d.gang === 6) {
        // 偎 + 别人摸或打
        this.cardsLayer.onGangMsg(d)
      } else if (d.gang === 7) {
        /// /手牌提
        this.cardsLayer.onAnGangMsg(d)
      }
    },

    roundEnd: function () {
      if (this.msgLog.indexOf('roundEnd') >= 0) {
        this.msgLog = []
      }
      this.msgLog.push('roundEnd')
      if (!this.isReplay) {
        this.eatActionLayer.hideEatLayertButtons()
      }

      let sData = appInstance.dataManager().getPlayData()
      let tData = sData.tableData

      if (tData.winner >= 0) {
        Pub.playSound('hu')
      } else if (tData.delEnd === 0) {
        Pub.playSound('huangzhuang')
      }

      if (tData.delEnd !== 0) {
        // 都同意解散了 就删除
        if (this.delRoomLayer !== null) {
          appInstance.uiManager().removeUI(this.delRoomLayer)
          this.delRoomLayer = null
        }
      }

      let dt = 0.5
      if (tData.winner >= 0) dt += 1 // 为了新的胡牌特效增加一秒钟延迟，本来是1秒的
      if (tData.xingCard > 0) dt += 1 // 翻醒
      this.runAction(cc.sequence(cc.delayTime(dt), cc.callFunc(function () {
        let ui = appInstance.uiManager().getUIByName('phzEndOneLayer')
        if (!ui) {
          // 确认是在下一局准备阶段发起的房间解散
          let isWaitReady = false
          let players = appInstance.dataManager().getPlayData().players
          for (let uid in players) {
            if (players[uid].mjState === Pub.TableState.isReady) {
              isWaitReady = true
              break
            }
          }
          if (tData.roundNum === 0 && isWaitReady) {
            let EndAllLayer = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/EndAllLayer')
            let endAllLayer = appInstance.uiManager().createPopUI(EndAllLayer)
            appInstance.sceneManager().getCurScene().addChild(endAllLayer) // 总结算
          } else {
            let EndOneLayer = includeSubModule(GameConfig.Module.EndOnesUI) // 单局结算
            let endoneLayer = appInstance.uiManager().createUI(EndOneLayer)
            appInstance.sceneManager().getCurScene().addChild(endoneLayer)
          }
        }

        this.clearTableView()
      }.bind(this))))
      this.cardsLayer.onRoundEndChange()
      this.PlayerHeadLayer.updatePlayerScore()
    },

    endRoom: function (d) {
      this.onEndRoom(d)
    },

    onlinePlayer: function (d) {
      this.msgLog.push('onlinePlayer' + d.uid + ', ' + d.onLine + ', ' + Date.now())
      this.waitLayer.updateReady()
      this.PlayerHeadLayer.updatePlayerOnline(d)
    },

    MJTick: function (d) {
    },

    DelRoom: function (d) {
      this.onDeleteRoom(d)
    },

    MJPassHu: function (d) {
    },

    onUserReady: function (d) {
      this.msgLog.push('onUserReady' + d.uid + ', ' + Date.now())
      if (d.uid === this.selfUId) {
        this.onEventClearCardUI() // 自己准备时清除上一局的牌桌数据(由endone移到这里)
      }
      this.waitLayer.updateReady()
      this.PlayerHeadLayer.updateReadyState(d)
    }
  })

  return TableBaseLayer
})
