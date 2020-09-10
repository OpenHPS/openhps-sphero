require("ts-node").register({
    compilerOptions: {
        module: "commonjs",
        moduleResolution: "node",
        target: "es6",
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strictNullChecks: false,
        noUnusedLocals: false,
        pretty: true,
        allowJs: true,
    },
    transpileOnly: true
});
