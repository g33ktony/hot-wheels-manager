module.exports = {
    apps: [
        {
            name: 'hw-backend',
            cwd: './backend',
            script: 'npm',
            args: 'run dev',
            env: {
                NODE_ENV: 'development',
                PORT: 3001
            },
            watch: ['src'],
            watch_delay: 1000,
            ignore_watch: ['node_modules', 'dist'],
            max_memory_restart: '500M',
            restart_delay: 2000,
            instances: 1,
            exec_mode: 'fork',
            error_file: './logs/backend-error.log',
            out_file: './logs/backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        },
        {
            name: 'hw-frontend',
            cwd: './frontend',
            script: 'npm',
            args: 'run dev',
            env: {
                NODE_ENV: 'development',
                VITE_API_URL: 'http://localhost:3001/api'
            },
            watch: ['src', 'index.html'],
            watch_delay: 1000,
            ignore_watch: ['node_modules', 'dist'],
            max_memory_restart: '500M',
            restart_delay: 2000,
            instances: 1,
            exec_mode: 'fork',
            error_file: './logs/frontend-error.log',
            out_file: './logs/frontend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        }
    ]
};
