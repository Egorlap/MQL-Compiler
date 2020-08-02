//! Поправить иконки svg для файлов mq, ex и т.д. убрать текст и заменить на изображение
//! Добавить в описание проблему со сменой языка интерфейса vs code

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const childProcess = require("child_process");
const fs = require("fs");
const pathModule = require("path");
const https = require("https");
var language;

try {
    const obja = fs.readFileSync(pathModule.join(__dirname, "../../", "argv.json"), "utf-8");
    let l = obja.indexOf("locale");
    if (l < 0) {
        language = "en";
    } else {
        let start = obja.indexOf('"', l + 7);
        let end = obja.indexOf('"', start + 1);
        language = obja.slice(start + 1, end);
    }
} catch (err) {
    language = "en";
}

let lang;
var Jdata = {};
language === "en" ? (lang = "") : (lang = "." + language);

let file = pathModule.join(__dirname, "landes" + lang + ".json");

if (!fs.existsSync(file)) {                                 // Если нет Русского
    let fileEn = pathModule.join(__dirname, "landes.json"); // Английский
    if (fs.existsSync(fileEn)) {                            // Проверяем на Английский. Если есть Английский
        Jdata = JSON.parse(fs.readFileSync(fileEn));
    }
} else {
    Jdata = JSON.parse(fs.readFileSync(file));
}

function lg(link) {
    let text;
    if (link in Jdata) {
        for (let m in Jdata) {
            if (m === link) {
                text = Jdata[m];
                break;
            }
        }
        return text;
    } else {
        return link;
    }
}

var CompileMQL = function () {
    var outputChannel = vscode.window.createOutputChannel("MetaEditor");

    function compileFile(path, rt) {
        const start = Date.now(),
            config = vscode.workspace.getConfiguration("mql_compiler"),
            fileName = pathModule.basename(path),
            extension = pathModule.extname(fileName),
            PathScript = pathModule.join(__dirname, "files", "compilemql.exe");

        let logFile, command, MetaDir, incDir, logDir, CommM, CommI, teq, Timemini = config.zbTimetomini, timeclose;

        if (extension === ".mq4") {
            MetaDir = config.Metaeditor4Dir;
            incDir = config.Include4Dir;
            logDir = config.LogDir;
            CommM = lg("path_editor4");
            CommI = lg("path_include_4");
        } else if (extension === ".mq5") {
            MetaDir = config.Metaeditor5Dir;
            incDir = config.Include5Dir;
            logDir = config.LogDir;
            CommM = lg("path_editor5");
            CommI = lg("path_include_5");
        } else {
            return;
        }

        switch (rt) {
            case 0: teq = lg("checking");
                break;
            case 1: teq = lg("compiling");
                break;
            case 2: teq = lg("comp_usi_script");
                break;
        }

        outputChannel.clear();
        outputChannel.show(true);
        outputChannel.appendLine("[Starting] " + teq + " >>> " + fileName + " <<<");

        const Nm = pathModule.basename(MetaDir);
        const Pm = pathModule.dirname(MetaDir);

        if ((fs.existsSync(Pm) && Nm === "metaeditor.exe") || Nm === "metaeditor64.exe") {
        } else {
            outputChannel.appendLine("[Error]  " + CommM + " [ " + MetaDir + " ]");
            return;
        }

        if (rt === 2 && Timemini.length > 0) {
            if (!/^\d+$/.test(Timemini)) {
                vscode.window.showWarningMessage(lg("invalid_timemini") + Timemini + " ]. " + lg("invalid_timemini_"));
                Timemini = 100;
            }
        } else if (rt === 2 && Timemini.length < 1) {
            vscode.window.showWarningMessage(lg("error_timemini") + " " + lg("invalid_timemini_"));
            Timemini = 100;
        }

        if (incDir.length > 0) {
            if (!fs.existsSync(incDir)) {
                outputChannel.appendLine("[Error]  " + CommI + " [ " + incDir + " ]");
                return;
            } else {
                teq = ' /include:"' + incDir + '"';
            }
        } else {
            teq = "";
        }

        if (logDir.length > 0) {
            const Elog = pathModule.extname(logDir);

            if (Elog === ".log") {
                logFile = path.replace(fileName, logDir);
            } else {
                logFile = path.replace(fileName, logDir + ".log");
            }
        } else {
            logFile = path.replace(fileName, fileName.slice(0, -4) + ".log");
        }

        command =  '"' + MetaDir + '"';
        command += ' /compile:"' + path + '"';
        command += teq;
        command += rt === 1 || rt === 2 ? "" : " /s";
        command += ' /log:"' + logFile + '"';

        
        childProcess.exec(command, (err, stdout, stderror) => {
            let yu, ms;

            if (stderror) {
                outputChannel.appendLine("[Error]  " + lg("editor64") + CommM + " [" + MetaDir + "] \n[Warning]" +
                    " " + lg("editor64to") + " [" + Pm + "\\" + (Nm === "metaeditor.exe" ? "metaeditor64.exe" : "metaeditor.exe") + "]");
                return;
            } 

            if (rt === 0) {
                outputChannel.appendLine(" \n");
            }

            try {
                var data = fs.readFileSync(logFile, "UCS-2");
            } catch (err) {
                vscode.window.showErrorMessage(lg("err_read_log") + err);
            }
            const end = Date.now();
            if (config.DeleteLog === true) {
                fs.unlinkSync(logFile);
            }

            if (rt === 1 || rt === 2) {
                let val = replaceCompile(deleteBom(data));
                yu = val.second;
                // ms = val.three;
                // vscode.window.showInformationMessage("ms_ " + ms);
                outputChannel.appendLine(val.first);
            } else {
                outputChannel.appendLine(replaceCheck(deleteBom(data)));
            }

            if (rt === 2 && yu === 0) {
                let pmb = config.zbMiniME === true ? 1 : 0,
                    pcb = config.zuCloseME === true ? 1 : 0,
                    timemin = Timemini < 100 ? 100 : Timemini;
                    timeclose = Math.ceil((end - start) * 0.01) * 100;
                    // timeclose = (ms * 2) + 1000;
                    // vscode.window.showInformationMessage("timeclose_ " + timeclose);

                command =  ' "' + PathScript + '"';
                command += ' "' + MetaDir + '"';
                command += ' "' + path + '"';
                command +=  " " + pmb;
                command +=  " " + timemin;
                command +=  " " + pcb;
                command +=  " " + timeclose;

                try {
                    childProcess.execSync(command);
                    if (extension === ".mq5") {
                         sleep(3000);
                    };
                } catch (err) {
                    outputChannel.appendLine("[Error] " + lg("err_start_script"));
                }
                //  childProcess.exec(command, (err, stdout, stderror) => {
                //     if (stderror) {
                //         outputChannel.appendLine("[Error] " + lg("err_start_script"));
                //     }
                //     // sleep(3000);
                // }); 
                
            }
        });
    }

    function replaceCompile(str) {
        let ft = str.split("\n"),
            text,
            zx,
            ye,
            dx,
            num;

        for (let i in ft) {
            ft = str.split("\n")[i];

            if (ft.includes(": information: compiling")) {
                zx = ft.indexOf(": compiling");
                zx = ft.slice(zx + 12);
                text += zx;
            } else if (ft.includes(": information: including")) {
                zx = ft.indexOf("including");
                zx = ft.slice(zx);
                text += zx;
            } else if (ft.includes("information: code generated")) {

            } else if (ft.includes("Result:")) {
                let cx = ft.indexOf("errors");
                // let int = ft.indexOf("warnings");
                // let ms = ft.indexOf("msec");
                cx = ft.slice(cx + 8, cx + 9);
                zx = ft.slice(8, 9);
                // dx = ft.slice(int + 10, ms - 1);
                // num = Number(dx);
                // vscode.window.showInformationMessage("_ " + typeof num + " _ " + num);

                if (zx !== "0") {
                    text += "[Error] " + ft;
                    ye = 1;
                } else if (cx !== "0") {
                    text += "[Warning] " + ft;
                    ye = 0;
                } else {
                    text += "[Done] " + ft;
                    ye = 0;
                }
            } else {
                if (!ft.includes("information: generating code")) {
                    text += ft;
                }
            }
        }
        return {
            first: text.includes("undefined") ? text.slice(9) : text,
            second: ye,
            // three: num,
        };
    }

    function replaceCheck(str) {
        let ft = str.split("\n"),
            text,
            zx;
        for (let i in ft) {
            ft = str.split("\n")[i];

            if (ft.includes(": information: checking")) {
                zx = ft.indexOf(": checking");
                zx = ft.slice(zx + 11);
                text += zx;
            } else if (ft.includes(": information: including")) {
                zx = ft.indexOf("including");
                zx = ft.slice(zx);
                text += zx;
            } else if (ft.includes(": information: result")) {
                let cx = ft.indexOf("errors");
                cx = ft.slice(cx + 8, cx + 9);
                zx = ft.slice(23, 24);

                if (zx !== "0") {
                    text += "[Error] Result:" + ft.slice(22);
                } else if (cx !== "0") {
                    text += "[Warning] Result:" + ft.slice(22);
                } else {
                    text += "[Done] Result:" + ft.slice(22);
                }
            } else {
                text += ft;
            }
        }
        return text.includes("undefined") ? text.slice(9) : text;
    }

    function deleteBom(str) {
        return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
    }

    return {
        CompileFileFromCommand: function (az) {
            vscode.commands.executeCommand("workbench.action.files.save");
            compileFile(vscode.window.activeTextEditor.document.fileName, az);
        },
    };
};

var Help = function () {
    function find() {
        const config = vscode.workspace.getConfiguration("mql_compiler");
        let helpval = config.zvHelpVal,
            command,
            PathHelp,
            loc;

        const { activeTextEditor } = vscode.window;
        if (!activeTextEditor) {
            return;
        }

        const { document, selection } = activeTextEditor;
        const { end, start } = selection;
        const isMultiLine = end.line !== start.line;
        if (isMultiLine) {
            return;
        }

        const isSelectionSearch =
            end.line !== start.line || end.character !== start.character;
        const wordAtCursorRange = isSelectionSearch
            ? selection
            : document.getWordRangeAtPosition(end);
        if (wordAtCursorRange === undefined) {
            return;
        }
        const extension = pathModule.extname(document.fileName);
        let keyword = document.getText(wordAtCursorRange);

        if (extension === ".mq4") {
            if (language === "ru") {
                PathHelp = pathModule.join(__dirname, "files", "Help", "mql4_russian.chm");
            } else {
                PathHelp = pathModule.join(__dirname, "files", "Help", "mql4.chm");
            }
        } else if (extension === ".mq5") {
            switch (language) {
                case "ru": {
                    loc = "_russian";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "zh-cn": {
                    loc = "_chinese";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "zh-tw": {
                    loc = "_chinese";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "fr": {
                    loc = "_french";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "de": {
                    loc = "_german";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "it": {
                    loc = "_italian";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "es": {
                    loc = "_spanish";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "ja": {
                    loc = "_japanese";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "pt-br": {
                    loc = "_portuguese";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                case "tr": {
                    loc = "_turkish";
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5" + loc + ".chm");
                    if (!fs.existsSync(PathHelp)) {
                        download(loc);
                        return;
                    }
                    break;
                }
                default: {
                    PathHelp = pathModule.join(__dirname, "files", "Help", "mql5.chm");
                    if (!fs.existsSync(PathHelp)) {
                        download("");
                        return;
                    }
                    break;
                }
            }
        }

        if (helpval.length > 0) {
            if (!/^\d+$/.test(helpval)) {
                vscode.window.showWarningMessage(
                    lg("invalid_Helpval") + helpval + " ] " + lg("invalid_Helpval_")
                );
                helpval = 150;
            }
        } else {
            vscode.window.showWarningMessage(
                lg("error_Helpval") + lg("invalid_Helpval_")
            );
            helpval = 150;
        }

        const Path = pathModule.join(__dirname, "files", "KeyHH.exe");
        
        for (let i = 0; i < 2; i++) {
            if (i < 1) {
                command = Path + " -Mql " + PathHelp;
            } else {
                command = Path + ' -Mql -#klink "' + keyword + '" ' + PathHelp;
            }
            childProcess.exec(command);
            sleep(helpval < 150 ? 150 : helpval);
        }
    }

    

    function download(locname) {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
            },
            (progress) => {
                progress.report({ message: lg("help_Lo") });
                return new Promise((resolve) => {
                    let req = https.get(
                        "https://www.mql5.com/files/docs/mt5/mql5/chm/mql5" +
                        locname + ".chm",
                        function (response) {
                            if (response.statusCode === 200) {
                                let file = fs.createWriteStream(
                                    pathModule.join(__dirname, "files", "Help", "mql5" + locname + ".chm")
                                );
                                response.pipe(file);
                                file.on("finish", function () {
                                    file.close();
                                    resolve();
                                    find();
                                });
                            } else {
                                resolve();
                                vscode.window.showWarningMessage(lg("help_er"));
                                return;
                            }
                        }
                    );
                });
            }
        );
    }

    return {
        HelpFileFromCommand: function () {
            find();
        },
    };
};

var Properties = function () {
    function CreateProper() {
        const workspacepath = vscode.workspace.rootPath;
        const pathconfig = pathModule.join( workspacepath, ".vscode", "c_cpp_properties.json" );

        if (!fs.existsSync(pathModule.join(workspacepath, ".vscode"))) {
            fs.mkdirSync(pathModule.join(workspacepath, ".vscode"));
        }

        if (!fs.existsSync(pathconfig)) {
            const proper = {
                configurations: [
                    {
                        name: "Win32",
                        includePath: [
                            "${workspaceFolder}/**",
                            pathModule.join(workspacepath, "Include"),
                        ],
                        defines: ["_DEBUG", "UNICODE", "_UNICODE"],
                        intelliSenseMode: "msvc-x64",
                    },
                ],
                version: 4,
            };

            try {
                fs.writeFileSync(pathconfig, JSON.stringify(proper, null, 4));
            } catch (err) {
                vscode.window.showErrorMessage(lg("c_cpp_er"));
            }
        } else{  
            let jfile = JSON.parse(fs.readFileSync(pathconfig)),
                flg  = 0;
            for(let i = 0; i < jfile.configurations[0].includePath.length; i++){
                if(jfile.configurations[0].includePath[i] === pathModule.join(workspacepath, "Include")){
                    flg = 1;
                    break;
                }
            }
            if(flg === 0){
                jfile.configurations[0].includePath.push(pathModule.join(workspacepath, "Include"));
                try {
                    fs.writeFileSync(pathconfig, JSON.stringify(jfile, null, 4));
                } catch (err) {
                    vscode.window.showErrorMessage(lg("c_cpp_add_er"));
                }
            }
        }

        const conf = vscode.workspace.getConfiguration();

        let object = {
            "**/*.ex4": true,
            "**/*.ex5": true,
        };

        let objass = {
            "*.mqh": "cpp",
            "*.mq4": "cpp",
            "*.mq5": "cpp",
        };

        let objtok = {
            textMateRules: [
                { scope: "token.error.mql", settings: { foreground: "#F44747" } },
                { scope: "token.done.mql", settings: { foreground: "#029c23d3" } },
                { scope: "token.warning.mql", settings: { foreground: "#ff9d00" } },
                { scope: "token.heading.mql", settings: { foreground: "#6796E6" } },
            ],
        };

        conf.update("C_Cpp.errorSquiggles", "Disabled", false);
        conf.update("mql_compiler.context", true, false);
        conf.update("editor.tokenColorCustomizations", objtok, false);
        conf.update("files.associations", objass, false);
        conf.update("files.exclude", object, false);
    }

    return {
        PropertiesFileFromCommand: function () {
            CreateProper();
        },
    };
};

var Icon = function () {
    function AddIcon(
        NameExt,       // Имя расширения
        FullNameExt,   // Полное имя расширение
        dirName,       // Папка куда копировать файлы иконок
        fileExt,       // Расширение файлов иконок (svg или png)
        IconFileNames, // Имена файлов иконок (массив [])
        dirJsonName,   // Папка где находится файл Json
        JsonFileName,  // Имя Json файла (массив [])
        PartPath       // Часть пути к папке куда копировать файлы иконок (./ или ../../ и т.д)
    ) {
        let NameDir = "",
            ButtonText = lg("but_text_i"),
            ButText = lg("but_text_r"),
            command = 'cmd /c "cd C:\\&&' + "code --install-extension " + FullNameExt + '"';
        const ExtenName = fs.readdirSync(pathModule.join(__dirname, "../"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

        for (let i = 0; i < ExtenName.length; i++) {
            if (ExtenName[i].includes(FullNameExt)) {
                NameDir = ExtenName[i];
                break;
            }
        }

        if (!NameDir.includes(FullNameExt)) {
            vscode.window.showInformationMessage(lg("s_i_m") + '"' + NameExt + '"', ButtonText)
                .then((selection) => {
                    if (selection === ButtonText) {
                        vscode.window.withProgress(
                            {
                                location: vscode.ProgressLocation.Notification,
                            },
                            (progress) => {
                                progress.report({ message: lg("s_i_m_1") + '"' + NameExt + '"' });
                                return new Promise((resolve) => {
                                    childProcess.exec(command, (err, stdout, stderror) => {
                                        if (stderror) {
                                            vscode.window.showErrorMessage(lg("s_e_m") + '"' + NameExt + '"' + lg("s_e_m_1"));
                                            resolve();
                                        } else {
                                            AddIcon(NameExt, FullNameExt, dirName, fileExt, IconFileNames, dirJsonName, JsonFileName, PartPath);
                                            resolve();
                                        }
                                    });
                                });
                            }
                        );
                    }
                });
        } else {
            for (let v = 0; v < IconFileNames.length; v++) {
                fs.copyFileSync(
                    pathModule.join(__dirname, "files", "icons", IconFileNames[v] + "." + fileExt),
                    pathModule.join(__dirname, "../", NameDir, dirName, IconFileNames[v] + "." + fileExt)
                );
            }

            for (let i = 0; i < JsonFileName.length; i++) {
                const obj = JSON.parse(fs.readFileSync(pathModule.join(__dirname, "../", NameDir, dirJsonName, JsonFileName[i] + ".json")));

                dirName = dirName.split("/")[dirName.split("/").length - 1];

                let vMql4 = { mq4: { iconPath: PartPath + dirName + "/mq4." + fileExt }, },
                    vMql5 = { mq5: { iconPath: PartPath + dirName + "/mq5." + fileExt } },
                    vMqlh = { mqh: { iconPath: PartPath + dirName + "/h." + fileExt } },
                    vMqlEx4 = { ex4: { iconPath: PartPath + dirName + "/ex4." + fileExt }, },
                    vMqlEx5 = { ex5: { iconPath: PartPath + dirName + "/ex5." + fileExt }, };

                Object.assign(obj.iconDefinitions, vMql4, vMql5, vMqlh, vMqlEx4, vMqlEx5);

                vMql4 = { mq4: "mq4" };
                vMql5 = { mq5: "mq5" };
                vMqlh = { mqh: "mqh" };
                vMqlEx4 = { ex4: "ex4" };
                vMqlEx5 = { ex5: "ex5" };

                Object.assign(obj.fileExtensions, vMql4, vMql5, vMqlh, vMqlEx4, vMqlEx5);

                const json = JSON.stringify(obj, null, 4);

                fs.writeFileSync(pathModule.join(__dirname, "../", NameDir, dirJsonName, JsonFileName[i] + ".json"), json, "utf8");

                vscode.window.showInformationMessage(lg("s_i_m_2") + '"' + NameExt + '"', ButText)
                    .then((selection) => {
                        if (selection === ButText) {
                            vscode.commands.executeCommand("workbench.action.reloadWindow");
                        }
                    });
            }
        }
    }

    return {
        IconFileFromCommand: function (ds) {
            switch (ds) {
                case 0: {
                    AddIcon(
                        "Material Icon Theme",
                        "pkief.material-icon-theme",
                        "icons",
                        "svg",
                        ["mq4", "mq5", "ex4", "ex5"],
                        "dist",
                        ["material-icons"],
                        "./../"
                    );
                    break;
                }
                case 1: {
                    AddIcon(
                        "vscode-icons",
                        "vscode-icons-team.vscode-icons",
                        "icons",
                        "svg",
                        ["mq4", "mq5", "ex4", "ex5", "h"],
                        "dist/src",
                        ["vsicons-icon-theme"],
                        "../../"
                    );
                    break;
                }
                case 2: {
                    AddIcon(
                        "VSCode Great Icons",
                        "emmanuelbeziat.vscode-great-icons",
                        "icons",
                        "png",
                        ["mq4", "mq5", "ex4", "ex5", "h"],
                        "",
                        ["icons"],
                        "./"
                    );
                    break;
                }
                case 3: {
                    AddIcon(
                        "Material Theme Icons",
                        "equinusocio.vsc-material-theme-icons",
                        "out/icons",
                        "svg",
                        [
                            "mq4", "mq5", "ex4", "ex5", "h"
                        ],
                        "out/variants",
                        [
                            "Material-Theme-Icons",
                            "Material-Theme-Icons-Darker",
                            "Material-Theme-Icons-Light",
                            "Material-Theme-Icons-Ocean",
                            "Material-Theme-Icons-Palenight",
                        ],
                        "../"
                    );
                }
            }
        },
    };
};

var Showfiles = function () {
    function OnOff(...args) {
        const conf = vscode.workspace.getConfiguration();
        let object = {};

        Object.assign(object, conf.files.exclude);

        for (let arg of args) {
            if (arg in object) {
                for (let k in object) {
                    if (k === arg) {
                        if (object[k] === false) {
                            object[k] = true;
                        } else if (object[k] === true) {
                            object[k] = false;
                        } else {
                            object[k] = true;
                        }
                        break;
                    }
                }
            } else {
                let value = { [arg]: true };
                Object.assign(object, value);
            }
        }
        conf.update("files.exclude", object, false);
    }

    return {
        ShowfilesFromCommand: function () {
            OnOff("**/*.ex4", "**/*.ex5");
        },
    };
};

function sleep(millisec) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < millisec);
}

function activate(context) {
    let e = CompileMQL(),
        h = Help(),
        p = Properties(),
        i = Icon(),
        s = Showfiles();

    function its() {
        let val;
        vscode.window
            .showQuickPick(
                [
                    {
                        label: "Material Icon Theme"
                    },
                    {
                        label: "VScode Icons"
                    },
                    {
                        label: "VSCode Great Icons"
                    },
                    {
                        label: "Material Theme Icons"
                    },
                ],
                {
                    placeHolder: lg("s_i_t")
                }
            )
            .then((item) => {
                if (!item) {
                    return;
                }

                switch (item.label) {
                    case "Material Icon Theme": {
                        val = 0;
                        break;
                    }
                    case "VScode Icons": {
                        val = 1;
                        break;
                    }
                    case "VSCode Great Icons": {
                        val = 2;
                        break;
                    }
                    case "Material Theme Icons": {
                        val = 3;
                        break;
                    }
                }
                i.IconFileFromCommand(val);
            });
    }

    function CompilerCommand(command, rt) {
        context.subscriptions.push(vscode.commands.registerCommand(command, () => { e.CompileFileFromCommand(rt); }));
    }

    function CompilerHelpCommand(command) {
        context.subscriptions.push(vscode.commands.registerCommand(command, () => { h.HelpFileFromCommand(); }));
    }

    function CompilerConfigCommand(command) {
        context.subscriptions.push(vscode.commands.registerCommand(command, () => { p.PropertiesFileFromCommand(); }));
    }

    function CompilerAddIconsCommand(command) {
        context.subscriptions.push(vscode.commands.registerCommand(command, () => { its(); }));
    }

    function CompilerShowfilesCommand(command) {
        context.subscriptions.push(vscode.commands.registerCommand(command, () => { s.ShowfilesFromCommand(); }));
    }

    CompilerCommand("mql_compiler.checkFile", 0);
    CompilerCommand("mql_compiler.compileFile", 1);
    CompilerCommand("mql_compiler.compileScript", 2);
    CompilerHelpCommand("mql_compiler.help");
    CompilerConfigCommand("mql_compiler.configurations");
    CompilerAddIconsCommand("mql_compiler.Addicon");
    CompilerShowfilesCommand("mql_compiler.Showfiles");
}

exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
