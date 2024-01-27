import * as React from "react";

const CustomCheckbox = ({ handleCheck }: { handleCheck: CallableFunction }) => {
    const [isChecked, setIsChecked] = React.useState(false);
    React.useEffect(() => {
        handleCheck(isChecked);
    }, [isChecked]);
    return (
        <div className="custom-checkbox" style={{ backgroundColor: isChecked ? "rgb(210,210,210)" : "rgb(40,40,40)" }} onClick={() => {
            setIsChecked(!isChecked);
        }}>
            <div className="checkbox-indicator" style={{
                transform: isChecked ? "translateX(40px)" : "translateX(0)",
            }}></div>
        </div>
    );
};

const Setting = ({ settingText, settingToggle }: { settingText: string, settingToggle: CallableFunction }) => {
    return (
        <>
            <hr></hr>
            <div className="setting">
                <label>{ settingText }</label>
                <CustomCheckbox handleCheck={ settingToggle }/>
            </div>
            <hr></hr>
        </>
    );
};

export const SettingsSection = () => {
    return (
        <div className="settings-content">
            <h1 className="title">Settings</h1>
            <div className="settings-list">
                <Setting settingText="I am a settingsettingsettingsettingsettingsettingsettingsettingsetting" settingToggle={() => {
                }}/>
                <Setting settingText="I am a settingsettingsettingsettingsettingsettingsettingsettingsetting" settingToggle={() => {
                }}/>
                <Setting settingText="I am a settingsettingsettingsettingsettingsettingsettingsettingsetting" settingToggle={() => {
                }}/>
            </div>
        </div>
    );
};
