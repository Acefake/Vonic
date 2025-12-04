; NSIS 自定义安装脚本
; 用于自定义 Windows 安装程序行为

!macro customHeader
  ; 自定义头部
!macroend

!macro preInit
  ; 安装前初始化
  ; 检查是否已安装旧版本
!macroend

!macro customInit
  ; 自定义初始化
!macroend

!macro customInstall
  ; 自定义安装步骤
  ; 可以在这里添加注册表项、文件关联等
  
  ; 示例：添加右键菜单（如需要请取消注释）
  ; WriteRegStr HKCR "*\shell\OpenWithVonic" "" "使用 Vonic 打开"
  ; WriteRegStr HKCR "*\shell\OpenWithVonic\command" "" '"$INSTDIR\vonic.exe" "%1"'
!macroend

!macro customUnInstall
  ; 自定义卸载步骤
  ; 清理注册表项等
  
  ; 示例：删除右键菜单（如需要请取消注释）
  ; DeleteRegKey HKCR "*\shell\OpenWithVonic"
!macroend

!macro customInstallMode
  ; 自定义安装模式
  ; StrCpy $isForceCurrentInstall "1" ; 强制当前用户安装
!macroend
