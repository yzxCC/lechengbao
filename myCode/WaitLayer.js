loadSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/TableLayer/WaitLayer', function () {
  let BaseLayer = include('Eos/Base/BaseLayer')
  let GameConfig = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/phzGameRes')
  let EnumType = include('Game/Config/Enum')
  let GameDetails = include('Game/GameDetails')
  let Pub = includeSubModule(appInstance.packageCfgMgr().moduleCfg.phz + '/src/phzPublicFunc')

  // let mapNodeToProps = {
  //   btnBackHome: 'back/backHomebtn',
  //   btnInvite: 'back/wxinvite',
  //   btnDeleteRoom: 'back/delroom',
  //   btnExitRoom: 'back/exitroombtn',
  //   // btnCopyToclip: 'back/copytoclip',
  //   btnReady: 'back/ready'
  // }

  let WaitLayer = BaseLayer.extend({
    ctor: function () {
      this._super(GameConfig.Csb.WaitLayer)
      this.waitReady = false
    },

    RES_BINDING: function () {
      return {
        'back/backHomebtn': { name: 'btnBackHome', onClicked: this.onBackHomeButtonClick },
        'back/wxinvite': { name: 'btnInvite', onClicked: this.onInviteButtonClick },
        'back/delroom': { name: 'btnDeleteRoom', onClicked: this.onDeleteRoomButtonClick },
        'back/exitroombtn': { name: 'btnExitRoom', onClicked: this.onExitRoomButtonClick },
        'back/ready': { name: 'btnReady', onClicked: this.onReadyButtonClick }
      }
    },

    onEnter: function () {
      this._super()
      this.updateButtonsState()
      this.updateReady()
    },

    onBackHomeButtonClick: function () {
      appInstance.eventManager().dispatchEvent('LEAVE_PLAY_SCENE')
    },

    onInviteButtonClick: function () {
      this.dispatchEvent('LocationClose')
      let sData = appInstance.dataManager().getPlayData()
      let tableInfo = sData.tableData
      let _shareType = EnumType.SHARE.COMMON_TABLE
      if (tableInfo.guildid) {
        _shareType = tableInfo.noAuto ? EnumType.SHARE.GUILD_PRIVATE_TABLE : EnumType.SHARE.GUILD_COMMON_TABLE
      }
      let options = {
        shareType: _shareType,
        tableInfo: tableInfo,
        content: {
          playTypeName: GameDetails.getPlayTypeName(sData.gameid, tableInfo.huziType),
          desc: GameDetails.getPlayTypeDescribe(sData.gameid, tableInfo.createPara._createType)
        }
      }
      // cc.log('on click invite =========' + JSON.stringify(options.content))
      let shareLayerClass = include('Game/Hall/ShareLayer')
      let shareLayer = appInstance.uiManager().createUI(shareLayerClass, options)
      appInstance.sceneManager().getCurScene().addChild(shareLayer)
    },

    onDeleteRoomButtonClick: function () {
      this.onExitRoomButtonClick()
    },

    onExitRoomButtonClick: function () {
      let isTableOwner = appInstance.dataManager().isTableOwner()
      let playData = appInstance.dataManager().getPlayData()
      if ((appInstance.dataManager().isGuildTable() || !isTableOwner) &&
        (playData.tableData.tState === Pub.TableState.waitJoin || playData.tableData.tState === Pub.TableState.waitReady)) {
        appInstance.gameManager().requestLeaveRoom(function (rtn) {
          if (rtn.result === 0) {
            appInstance.eventManager().dispatchEvent('LEAVE_PLAY_SCENE')
          } else {
            let ErrorCode = include('Game/Config/ErrorCode')
            let errorMsg = ErrorCode.Text[rtn.result]
            if (errorMsg) {
              appInstance.uiManager().popSystemMessage(errorMsg)
            }
          }
        })
      } else {
        appInstance.gameNet().request('pkroom.handler.tableMsg', { cmd: 'DelRoom', yes: true })
      }
    },

    onReadyButtonClick: function () {
      Pub.MJReady2Net()
    },

    updateReady: function () {
      let sData = appInstance.dataManager().getPlayData()
      let tData = sData.tableData
      let roomState = tData.tState
      // 解散房间或者退出房间
      let selfUid = appInstance.dataManager().selfUid()
      let pl = sData.players[selfUid]
      // 准备
      cc.log('waitlayer update ready ++++++++++%s, tState = %s', pl.mjState, roomState)
      this.waitReady = (pl.mjState <= Pub.TableState.waitReady && roomState <= Pub.TableState.waitReady)
      if (roomState === Pub.TableState.roundFinish && pl.mjState !== Pub.TableState.isReady) {
        this.waitReady = true
      }

      this.btnReady.setVisible(this.waitReady)
    },

    updateButtonsState: function () {
      // 解散房间或者退出房间
      let isTableOwner = appInstance.dataManager().isTableOwner()

      let visible = !Pub.isGameStart()
      this.btnExitRoom.setVisible(false)
      this.btnDeleteRoom.setVisible(false)
      // 返回大厅
      this.btnBackHome.setVisible(visible)
      // 邀请
      this.btnInvite.setVisible(visible)
      // 解散 退出
      if (visible) {
        this.btnExitRoom.setVisible(true)
        if (!appInstance.dataManager().isGuildTable() && isTableOwner) {
          this.btnDeleteRoom.setVisible(true)
          this.btnExitRoom.setVisible(false)
        }
      }

      this.btnReady.setVisible(this.waitReady)
      // 复制房间
      // this.props.btnCopyToclip.setVisible(roomState <= TableState.waitReady && !isHandCards)
    },

    hideButtons: function () {
      this.btnExitRoom.setVisible(false)
      this.btnDeleteRoom.setVisible(false)
      // 返回大厅
      this.btnBackHome.setVisible(false)
      // 邀请
      this.btnInvite.setVisible(false)
      this.btnReady.setVisible(false)
    }
  })
  return WaitLayer
})
