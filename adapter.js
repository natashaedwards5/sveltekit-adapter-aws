"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapter = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const child_process_1 = require("child_process");
const esbuild = __importStar(require("esbuild"));
const dotenv_1 = require("dotenv");
const fs_1 = require("fs");
const updateDotenv = require('update-dotenv');
function adapter({ artifactPath = 'build', autoDeploy = false, cdkProjectPath = `${__dirname}/deploy/index.js`, stackName = 'sveltekit-adapter-aws-webapp', esbuildOptions = {}, FQDN, LOG_RETENTION_DAYS, MEMORY_SIZE, zoneName = '', env = {}, } = {}) {
    /** @type {import('@sveltejs/kit').Adapter} */
    return {
        name: 'adapter-awscdk',
        adapt(builder) {
            var _a, _b, _c, _d;
            return __awaiter(this, void 0, void 0, function* () {
                const environment = (0, dotenv_1.config)({ path: (0, path_1.join)(process.cwd(), '.env') });
                (0, fs_extra_1.emptyDirSync)(artifactPath);
                const static_directory = (0, path_1.join)(artifactPath, 'assets');
                if (!(0, fs_extra_1.existsSync)(static_directory)) {
                    (0, fs_extra_1.mkdirSync)(static_directory, { recursive: true });
                }
                const prerendered_directory = (0, path_1.join)(artifactPath, 'prerendered');
                if (!(0, fs_extra_1.existsSync)(prerendered_directory)) {
                    (0, fs_extra_1.mkdirSync)(prerendered_directory, { recursive: true });
                }
                const server_directory = (0, path_1.join)(artifactPath, 'server');
                if (!(0, fs_extra_1.existsSync)(server_directory)) {
                    (0, fs_extra_1.mkdirSync)(server_directory, { recursive: true });
                }
                builder.log.minor('Copying asset files.');
                const clientFiles = yield builder.writeClient(static_directory);
                builder.log.minor('Copying server files.');
                yield builder.writeServer(artifactPath);
                (0, fs_extra_1.copyFileSync)(`${__dirname}/lambda/serverless.js`, `${server_directory}/_index.js`);
                (0, fs_extra_1.copyFileSync)(`${__dirname}/lambda/shims.js`, `${server_directory}/shims.js`);
                builder.log.minor('Building AWS Lambda server function.');
                esbuild.buildSync({
                    entryPoints: [`${server_directory}/_index.js`],
                    outfile: `${server_directory}/index.js`,
                    inject: [(0, path_1.join)(`${server_directory}/shims.js`)],
                    external: ['node:*', ...((_a = esbuildOptions === null || esbuildOptions === void 0 ? void 0 : esbuildOptions.external) !== null && _a !== void 0 ? _a : [])],
                    format: (_b = esbuildOptions === null || esbuildOptions === void 0 ? void 0 : esbuildOptions.format) !== null && _b !== void 0 ? _b : 'cjs',
                    banner: (_c = esbuildOptions === null || esbuildOptions === void 0 ? void 0 : esbuildOptions.banner) !== null && _c !== void 0 ? _c : {},
                    bundle: true,
                    platform: 'node',
                    target: (_d = esbuildOptions === null || esbuildOptions === void 0 ? void 0 : esbuildOptions.target) !== null && _d !== void 0 ? _d : 'node16',
                    treeShaking: true,
                });
                builder.log.minor('Prerendering static pages.');
                const prerenderedFiles = yield builder.writePrerendered(prerendered_directory);
                builder.log.minor('Cleanup project.');
                (0, fs_extra_1.unlinkSync)(`${server_directory}/_index.js`);
                (0, fs_extra_1.unlinkSync)(`${artifactPath}/index.js`);
                builder.log.minor('Exporting routes.');
                const routes = [
                    ...new Set([...clientFiles, ...prerenderedFiles]
                        .map((x) => {
                        const z = (0, path_1.dirname)(x);
                        if (z === '.')
                            return x;
                        if (z.includes('/'))
                            return undefined;
                        return `${z}/*`;
                    })
                        .filter(Boolean)),
                ];
                (0, fs_1.writeFileSync)((0, path_1.join)(artifactPath, 'routes.json'), JSON.stringify(routes));
                builder.log.minor('Deploy using AWS-CDK.');
                autoDeploy &&
                    (0, child_process_1.spawnSync)('npx', [
                        'cdk',
                        'deploy',
                        '--app',
                        cdkProjectPath,
                        '*',
                        '--require-approval',
                        'never',
                        '--outputsFile',
                        (0, path_1.join)(__dirname, 'cdk.out', 'cdk-env-vars.json'),
                    ], {
                        cwd: __dirname,
                        stdio: [process.stdin, process.stdout, process.stderr],
                        env: Object.assign({
                            PROJECT_PATH: (0, path_1.join)(process.cwd(), '.env'),
                            SERVER_PATH: (0, path_1.join)(process.cwd(), server_directory),
                            STATIC_PATH: (0, path_1.join)(process.cwd(), static_directory),
                            PRERENDERED_PATH: (0, path_1.join)(process.cwd(), prerendered_directory),
                            ROUTES: routes,
                            STACKNAME: stackName,
                            FQDN,
                            LOG_RETENTION_DAYS,
                            MEMORY_SIZE,
                            ZONE_NAME: zoneName,
                        }, process.env, env),
                    });
                try {
                    const rawData = (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, 'cdk.out', 'cdk-env-vars.json')).toString();
                    const data = JSON.parse(rawData);
                    const out = Object.keys(data).reduce((p, n) => (Object.assign(Object.assign({}, p), Object.keys(data[n])
                        .filter((x) => !x.includes('ExportsOutput'))
                        .reduce((p, x) => {
                        p[x.toUpperCase()] = data[n][x];
                        return p;
                    }, {}))), {});
                    updateDotenv(Object.assign(Object.assign({}, environment.parsed), out));
                    (0, fs_extra_1.unlinkSync)((0, path_1.join)(__dirname, 'cdk.out', 'cdk-env-vars.json'));
                }
                catch (_e) { }
                builder.log.minor('AWS-CDK deployment done.');
            });
        },
    };
}
exports.adapter = adapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBdUc7QUFDdkcsK0JBQXFDO0FBQ3JDLGlEQUEwQztBQUMxQyxpREFBbUM7QUFDbkMsbUNBQWdDO0FBQ2hDLDJCQUFtQztBQUNuQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFlOUMsU0FBZ0IsT0FBTyxDQUFDLEVBQ3RCLFlBQVksR0FBRyxPQUFPLEVBQ3RCLFVBQVUsR0FBRyxLQUFLLEVBQ2xCLGNBQWMsR0FBRyxHQUFHLFNBQVMsa0JBQWtCLEVBQy9DLFNBQVMsR0FBRyw4QkFBOEIsRUFDMUMsY0FBYyxHQUFHLEVBQUUsRUFDbkIsSUFBSSxFQUNKLGtCQUFrQixFQUNsQixXQUFXLEVBQ1gsUUFBUSxHQUFHLEVBQUUsRUFDYixHQUFHLEdBQUcsRUFBRSxNQUNXLEVBQUU7SUFDckIsOENBQThDO0lBQzlDLE9BQU87UUFDTCxJQUFJLEVBQUUsZ0JBQWdCO1FBQ2hCLEtBQUssQ0FBQyxPQUFZOzs7Z0JBQ3RCLE1BQU0sV0FBVyxHQUFHLElBQUEsZUFBTSxFQUFDLEVBQUUsSUFBSSxFQUFFLElBQUEsV0FBSSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2xFLElBQUEsdUJBQVksRUFBQyxZQUFZLENBQUMsQ0FBQztnQkFFM0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFBLFdBQUksRUFBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3RELElBQUksQ0FBQyxJQUFBLHFCQUFVLEVBQUMsZ0JBQWdCLENBQUMsRUFBRTtvQkFDakMsSUFBQSxvQkFBUyxFQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7aUJBQ2xEO2dCQUVE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LEVBQUUsQ0FDSCxDQUFDO29CQUVGLFlBQVksaUNBQU0sV0FBVyxDQUFDLE1BQU0sR0FBSyxHQUFHLEVBQUcsQ0FBQztvQkFDaEQsSUFBQSxxQkFBVSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO2lCQUM3RDtnQkFBQyxXQUFNLEdBQUU7Z0JBRVYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQzs7U0FDL0M7S0FDRixDQUFDO0FBQ0osQ0FBQztBQTVJRCwwQkE0SUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjb3B5RmlsZVN5bmMsIHVubGlua1N5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgZW1wdHlEaXJTeW5jLCByZWFkRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBqb2luLCBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGVzYnVpbGQgZnJvbSAnZXNidWlsZCc7XG5pbXBvcnQgeyBjb25maWcgfSBmcm9tICdkb3RlbnYnO1xuaW1wb3J0IHsgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmNvbnN0IHVwZGF0ZURvdGVudiA9IHJlcXVpcmUoJ3VwZGF0ZS1kb3RlbnYnKTtcblxuZXhwb3J0IGludGVyZmFjZSBBV1NBZGFwdGVyUHJvcHMge1xuICBhcnRpZmFjdFBhdGg/OiBzdHJpbmc7XG4gIGF1dG9EZXBsb3k/OiBib29sZWFuO1xuICBjZGtQcm9qZWN0UGF0aD86IHN0cmluZztcbiAgc3RhY2tOYW1lPzogc3RyaW5nO1xuICBlc2J1aWxkT3B0aW9ucz86IGFueTtcbiAgRlFETj86IHN0cmluZztcbiAgTE9HX1JFVEVOVElPTl9EQVlTPzogbnVtYmVyO1xuICBNRU1PUllfU0laRT86IG51bWJlcjtcbiAgem9uZU5hbWU/OiBzdHJpbmc7XG4gIGVudj86IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGFwdGVyKHtcbiAgYXJ0aWZhY3RQYXRoID0gJ2J1aWxkJyxcbiAgYXV0b0RlcGxveSA9IGZhbHNlLFxuICBjZGtQcm9qZWN0UGF0aCA9IGAke19fZGlybmFtZX0vZGVwbG95L2luZGV4LmpzYCxcbiAgc3RhY2tOYW1lID0gJ3N2ZWx0ZWtpdC1hZGFwdGVyLWF3cy13ZWJhcHAnLFxuICBlc2J1aWxkT3B0aW9ucyA9IHt9LFxuICBGUUROLFxuICBMT0dfUkVURU5USU9OX0RBWVMsXG4gIE1FTU9SWV9TSVpFLFxuICB6b25lTmFtZSA9ICcnLFxuICBlbnYgPSB7fSxcbn06IEFXU0FkYXB0ZXJQcm9wcyA9IHt9KSB7XG4gIC8qKiBAdHlwZSB7aW1wb3J0KCdAc3ZlbHRlanMva2l0JykuQWRhcHRlcn0gKi9cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnYWRhcHRlci1hd3NjZGsnLFxuICAgIGFzeW5jIGFkYXB0KGJ1aWxkZXI6IGFueSkge1xuICAgICAgY29uc3QgZW52aXJvbm1lbnQgPSBjb25maWcoeyBwYXRoOiBqb2luKHByb2Nlc3MuY3dkKCksICcuZW52JykgfSk7XG4gICAgICBlbXB0eURpclN5bmMoYXJ0aWZhY3RQYXRoKTtcblxuICAgICAgY29uc3Qgc3RhdGljX2RpcmVjdG9yeSA9IGpvaW4oYXJ0aWZhY3RQYXRoLCAnYXNzZXRzJyk7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMoc3RhdGljX2RpcmVjdG9yeSkpIHtcbiAgICAgICAgbWtkaXJTeW5jKHN0YXRpY19kaXJlY3RvcnksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwcmVyZW5kZXJlZF9kaXJlY3RvcnkgPSBqb2luKGFydGlmYWN0UGF0aCwgJ3ByZXJlbmRlcmVkJyk7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMocHJlcmVuZGVyZWRfZGlyZWN0b3J5KSkge1xuICAgICAgICBta2RpclN5bmMocHJlcmVuZGVyZWRfZGlyZWN0b3J5LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2VydmVyX2RpcmVjdG9yeSA9IGpvaW4oYXJ0aWZhY3RQYXRoLCAnc2VydmVyJyk7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMoc2VydmVyX2RpcmVjdG9yeSkpIHtcbiAgICAgICAgbWtkaXJTeW5jKHNlcnZlcl9kaXJlY3RvcnksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuXG4gICAgICBidWlsZGVyLmxvZy5taW5vcignQ29weWluZyBhc3NldCBmaWxlcy4nKTtcbiAgICAgIGNvbnN0IGNsaWVudEZpbGVzID0gYXdhaXQgYnVpbGRlci53cml0ZUNsaWVudChzdGF0aWNfZGlyZWN0b3J5KTtcblxuICAgICAgYnVpbGRlci5sb2cubWlub3IoJ0NvcHlpbmcgc2VydmVyIGZpbGVzLicpO1xuICAgICAgYXdhaXQgYnVpbGRlci53cml0ZVNlcnZlcihhcnRpZmFjdFBhdGgpO1xuICAgICAgY29weUZpbGVTeW5jKGAke19fZGlybmFtZX0vbGFtYmRhL3NlcnZlcmxlc3MuanNgLCBgJHtzZXJ2ZXJfZGlyZWN0b3J5fS9faW5kZXguanNgKTtcbiAgICAgIGNvcHlGaWxlU3luYyhgJHtfX2Rpcm5hbWV9L2xhbWJkYS9zaGltcy5qc2AsIGAke3NlcnZlcl9kaXJlY3Rvcnl9L3NoaW1zLmpzYCk7XG5cbiAgICAgIGJ1aWxkZXIubG9nLm1pbm9yKCdCdWlsZGluZyBBV1MgTGFtYmRhIHNlcnZlciBmdW5jdGlvbi4nKTtcbiAgICAgIGVzYnVpbGQuYnVpbGRTeW5jKHtcbiAgICAgICAgZW50cnlQb2ludHM6IFtgJHtzZXJ2ZXJfZGlyZWN0b3J5fS9faW5kZXguanNgXSxcbiAgICAgICAgb3V0ZmlsZTogYCR7c2VydmVyX2RpcmVjdG9yeX0vaW5kZXguanNgLFxuICAgICAgICBpbmplY3Q6IFtqb2luKGAke3NlcnZlcl9kaXJlY3Rvcnl9L3NoaW1zLmpzYCldLFxuICAgICAgICBleHRlcm5hbDogWydub2RlOionLCAuLi4oZXNidWlsZE9wdGlvbnM/LmV4dGVybmFsID8/IFtdKV0sXG4gICAgICAgIGZvcm1hdDogZXNidWlsZE9wdGlvbnM/LmZvcm1hdCA/PyAnY2pzJyxcbiAgICAgICAgYmFubmVyOiBlc2J1aWxkT3B0aW9ucz8uYmFubmVyID8/IHt9LFxuICAgICAgICBidW5kbGU6IHRydWUsXG4gICAgICAgIHBsYXRmb3JtOiAnbm9kZScsXG4gICAgICAgIHRhcmdldDogZXNidWlsZE9wdGlvbnM/LnRhcmdldCA/PyAnbm9kZTE2JyxcbiAgICAgICAgdHJlZVNoYWtpbmc6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgYnVpbGRlci5sb2cubWlub3IoJ1ByZXJlbmRlcmluZyBzdGF0aWMgcGFnZXMuJyk7XG4gICAgICBjb25zdCBwcmVyZW5kZXJlZEZpbGVzID0gYXdhaXQgYnVpbGRlci53cml0ZVByZXJlbmRlcmVkKHByZXJlbmRlcmVkX2RpcmVjdG9yeSk7XG5cbiAgICAgIGJ1aWxkZXIubG9nLm1pbm9yKCdDbGVhbnVwIHByb2plY3QuJyk7XG4gICAgICB1bmxpbmtTeW5jKGAke3NlcnZlcl9kaXJlY3Rvcnl9L19pbmRleC5qc2ApO1xuICAgICAgdW5saW5rU3luYyhgJHthcnRpZmFjdFBhdGh9L2luZGV4LmpzYCk7XG5cbiAgICAgIGJ1aWxkZXIubG9nLm1pbm9yKCdFeHBvcnRpbmcgcm91dGVzLicpO1xuXG4gICAgICBjb25zdCByb3V0ZXMgPSBbXG4gICAgICAgIC4uLm5ldyBTZXQoXG4gICAgICAgICAgWy4uLmNsaWVudEZpbGVzLCAuLi5wcmVyZW5kZXJlZEZpbGVzXVxuICAgICAgICAgICAgLm1hcCgoeCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCB6ID0gZGlybmFtZSh4KTtcbiAgICAgICAgICAgICAgaWYgKHogPT09ICcuJykgcmV0dXJuIHg7XG4gICAgICAgICAgICAgIGlmICh6LmluY2x1ZGVzKCcvJykpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIHJldHVybiBgJHt6fS8qYDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICksXG4gICAgICBdO1xuXG4gICAgICB3cml0ZUZpbGVTeW5jKGpvaW4oYXJ0aWZhY3RQYXRoLCAncm91dGVzLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkocm91dGVzKSk7XG5cbiAgICAgIGJ1aWxkZXIubG9nLm1pbm9yKCdEZXBsb3kgdXNpbmcgQVdTLUNESy4nKTtcbiAgICAgIGF1dG9EZXBsb3kgJiZcbiAgICAgICAgc3Bhd25TeW5jKFxuICAgICAgICAgICducHgnLFxuICAgICAgICAgIFtcbiAgICAgICAgICAgICdjZGsnLFxuICAgICAgICAgICAgJ2RlcGxveScsXG4gICAgICAgICAgICAnLS1hcHAnLFxuICAgICAgICAgICAgY2RrUHJvamVjdFBhdGgsXG4gICAgICAgICAgICAnKicsXG4gICAgICAgICAgICAnLS1yZXF1aXJlLWFwcHJvdmFsJyxcbiAgICAgICAgICAgICduZXZlcicsXG4gICAgICAgICAgICAnLS1vdXRwdXRzRmlsZScsXG4gICAgICAgICAgICBqb2luKF9fZGlybmFtZSwgJ2Nkay5vdXQnLCAnY2RrLWVudi12YXJzLmpzb24nKSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGN3ZDogX19kaXJuYW1lLFxuICAgICAgICAgICAgc3RkaW86IFtwcm9jZXNzLnN0ZGluLCBwcm9jZXNzLnN0ZG91dCwgcHJvY2Vzcy5zdGRlcnJdLFxuICAgICAgICAgICAgZW52OiBPYmplY3QuYXNzaWduKFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgUFJPSkVDVF9QQVRIOiBqb2luKHByb2Nlc3MuY3dkKCksICcuZW52JyksXG4gICAgICAgICAgICAgICAgU0VSVkVSX1BBVEg6IGpvaW4ocHJvY2Vzcy5jd2QoKSwgc2VydmVyX2RpcmVjdG9yeSksXG4gICAgICAgICAgICAgICAgU1RBVElDX1BBVEg6IGpvaW4ocHJvY2Vzcy5jd2QoKSwgc3RhdGljX2RpcmVjdG9yeSksXG4gICAgICAgICAgICAgICAgUFJFUkVOREVSRURfUEFUSDogam9pbihwcm9jZXNzLmN3ZCgpLCBwcmVyZW5kZXJlZF9kaXJlY3RvcnkpLFxuICAgICAgICAgICAgICAgIFJPVVRFUzogcm91dGVzLFxuICAgICAgICAgICAgICAgIFNUQUNLTkFNRTogc3RhY2tOYW1lLFxuICAgICAgICAgICAgICAgIEZRRE4sXG4gICAgICAgICAgICAgICAgTE9HX1JFVEVOVElPTl9EQVlTLFxuICAgICAgICAgICAgICAgIE1FTU9SWV9TSVpFLFxuICAgICAgICAgICAgICAgIFpPTkVfTkFNRTogem9uZU5hbWUsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHByb2Nlc3MuZW52LFxuICAgICAgICAgICAgICBlbnZcbiAgICAgICAgICAgICksXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByYXdEYXRhID0gcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnY2RrLm91dCcsICdjZGstZW52LXZhcnMuanNvbicpKS50b1N0cmluZygpO1xuICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyYXdEYXRhKTtcbiAgICAgICAgY29uc3Qgb3V0ID0gT2JqZWN0LmtleXMoZGF0YSkucmVkdWNlKFxuICAgICAgICAgIChwLCBuKSA9PiAoe1xuICAgICAgICAgICAgLi4ucCxcbiAgICAgICAgICAgIC4uLk9iamVjdC5rZXlzKGRhdGFbbl0pXG4gICAgICAgICAgICAgIC5maWx0ZXIoKHg6IHN0cmluZykgPT4gIXguaW5jbHVkZXMoJ0V4cG9ydHNPdXRwdXQnKSlcbiAgICAgICAgICAgICAgLnJlZHVjZSgocDogYW55LCB4OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBwW3gudG9VcHBlckNhc2UoKV0gPSBkYXRhW25dW3hdO1xuICAgICAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICAgICAgICB9LCB7fSksXG4gICAgICAgICAgfSksXG4gICAgICAgICAge31cbiAgICAgICAgKTtcblxuICAgICAgICB1cGRhdGVEb3RlbnYoeyAuLi5lbnZpcm9ubWVudC5wYXJzZWQsIC4uLm91dCB9KTtcbiAgICAgICAgdW5saW5rU3luYyhqb2luKF9fZGlybmFtZSwgJ2Nkay5vdXQnLCAnY2RrLWVudi12YXJzLmpzb24nKSk7XG4gICAgICB9IGNhdGNoIHt9XG5cbiAgICAgIGJ1aWxkZXIubG9nLm1pbm9yKCdBV1MtQ0RLIGRlcGxveW1lbnQgZG9uZS4nKTtcbiAgICB9LFxuICB9O1xufVxuIl19