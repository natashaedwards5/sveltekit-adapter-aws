export interface AWSAdapterProps {
    artifactPath?: string;
    autoDeploy?: boolean;
    cdkProjectPath?: string;
    stackName?: string;
    esbuildOptions?: any;
    FQDN?: string;
    LOG_RETENTION_DAYS?: number;
    MEMORY_SIZE?: number;
    zoneName?: string;
    env?: {
        [key: string]: string;
    };
}
export declare function adapter({ artifactPath, autoDeploy, cdkProjectPath, stackName, esbuildOptions, FQDN, LOG_RETENTION_DAYS, MEMORY_SIZE, zoneName, env, }?: AWSAdapterProps): {
    name: string;
    adapt(builder: any): Promise<void>;
};
