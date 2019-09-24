const dotenv = require('dotenv')
const log = require('@ui5/logger').getLogger('server:middleware:proxy')
const request = require('request').defaults({ proxy: 'http://proxy.shrd.dbgcloud.io:3128' })
dotenv.config({ path: 'variables.env' })

/**
 * Custom UI5 Server proxy middleware
 *
 * @param {Object} parameters Parameters
 * @param {Object} parameters.resources Resource collections
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.all Reader or Collection to read resources of the root project and its dependencies
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.rootProject Reader or Collection to read resources of the project the server is started in
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.dependencies Reader or Collection to read resources of the projects dependencies
 * @param {Object} parameters.options Options
 * @param {string} [parameters.options.configuration] Custom server middleware configuration if given in ui5.yaml
 * @returns {function} Middleware function to use
 */
module.exports = function ({ resources, options }) {
    return async function (req, res, next) {

        // redirect resources request
        if (req.path.startsWith('/resources')) {
            req.pipe(request(`https://sapui5.hana.ondemand.com/sdk${req.path}`)).pipe(res)
        }

        // redirect theme request
        else if (req.path.startsWith('/dbagtheme')) {
            req.pipe(request(`https://dbaglightblue-a2be7e59b.dispatcher.hana.ondemand.com${req.path.replace('/dbagtheme', '/')}`)).pipe(res)
        }

        // redirect dbag zep library request
        else if (req.path.startsWith('/dbag/zep/lib')) {
            req.pipe(request(`https://crmzeplibary-a2be7e59b.dispatcher.hana.ondemand.com${req.path.replace('/dbag/zep/lib', '/')}`)).pipe(res)
        }

        // redirect dbag sapui5 library request
        else if (req.path.startsWith('/dbag/sapui5/library')) {
            req.pipe(request(`https://sapcrmdbagsapui5library-a2be7e59b.dispatcher.hana.ondemand.com${req.path.replace('/dbag/sapui5/library', '/')}`)).pipe(res)
        }

        // redirect user information request
        else if (req.path.startsWith('/UserInformation')) {
            const resource = await resources.rootProject.byPath('/localService/UserInformation.json')   // get local json file

            // if resource is not found, log warning and continue
            if (!resource) {
                log.error('No file found at /localService/UserInformation.json')
                next()
            }

            const userData = await resource.getString() // read file
            res.json(JSON.parse(userData))  // parse and send json response
        }

        // redirect portal request
        else if (req.path.startsWith('/customerportal')) {
            req
                .pipe(request({
                    url: `http://sapdkubs1.deutsche-boerse.de:8081/${req.path}`, // target url
                    qs: req.query,  // append query options if there are any
                    proxy: null,    // disable default proxy
                    headers: {      // set request headers
                        'user-contract': 'F9F02828E9331ED7AACF098EAC9B86A9',
                        'X-Requested-With': 'X',
                        'sap-language': 'EN'
                    },
                    'auth': {   // set basic authorization headers
                        'user': `${process.env.portalUsername}`,
                        'pass': `${process.env.portalPassword}`,
                        'sendImmediately': true
                    }
                })
                .on('error', () => {
                    log.error(`
                        Make sure username and password are maintained in the variables.env file!\n
                        Request path: ${req.path}
                    `)
                }))
                .pipe(res)
        }

        // if no path matches, forward request
        else next()
    }
}