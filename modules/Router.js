import invariant from 'invariant'
import React from 'react'
import createReactClass from 'create-react-class'
import { func, object } from 'prop-types'

import createTransitionManager from './createTransitionManager'
import { routes } from './InternalPropTypes'
import RouterContext from './RouterContext'
import { createRoutes } from './RouteUtils'
import { createRouterObject, assignRouterState } from './RouterUtils'
import warning from './routerWarning'

const propTypes = {
  history: object,
  children: routes,
  routes, // alias for children
  render: func,
  createElement: func,
  onError: func,
  onUpdate: func,

  // PRIVATE: For client-side rehydration of server match.
  matchContext: object
}

const prefixUnsafeLifecycleMethods = typeof React.forwardRef !== 'undefined'

/**
 * A <Router> is a high-level API for automatically setting up
 * a router that renders a <RouterContext> with all the props
 * it needs each time the URL changes.
 */
const Router = createReactClass({
  displayName: 'Router',

  propTypes,

  getDefaultProps() {
    return {
      render(props) {
        return <RouterContext {...props} />
      }
    }
  },

  getInitialState() {
    return {
      location: null,
      routes: null,
      params: null,
      components: null
    }
  },

  handleError(error) {
    if (this.props.onError) {
      this.props.onError.call(this, error)
    } else {
      // Throw errors by default so we don't silently swallow them!
      throw error // This error probably occurred in getChildRoutes or getComponents.
    }
  },

  createRouterObject(state) {
    const { matchContext } = this.props
    if (matchContext) {
      return matchContext.router
    }

    const { history } = this.props
    return createRouterObject(history, this.transitionManager, state)
  },

  createTransitionManager() {
    const { matchContext } = this.props
    if (matchContext) {
      return matchContext.transitionManager
    }

    const { history } = this.props
    const { routes, children } = this.props

    invariant(
      history.getCurrentLocation,
      'You have provided a history object created with history v4.x or v2.x ' +
        'and earlier. This version of React Router is only compatible with v3 ' +
        'history objects. Please change to history v3.x.'
    )

    return createTransitionManager(
      history,
      createRoutes(routes || children)
    )
  },

  // this method will be updated to UNSAFE_componentWillMount below for React versions >= 16.3
  componentWillMount() {
    this.transitionManager = this.createTransitionManager()
    this.router = this.createRouterObject(this.state)

    this._unlisten = this.transitionManager.listen((error, state) => {
      if (error) {
        this.handleError(error)
      } else {
        // Keep the identity of this.router because of a caveat in ContextUtils:
        // they only work if the object identity is preserved.
        assignRouterState(this.router, state)
        this.setState(state, this.props.onUpdate)
      }
    })
  },

  // this method will be updated to UNSAFE_componentWillReceiveProps below for React versions >= 16.3
  /* istanbul ignore next: sanity check */
  componentWillReceiveProps(nextProps) {
    warning(
      nextProps.history === this.props.history,
      'You cannot change <Router history>; it will be ignored'
    )

    warning(
      (nextProps.routes || nextProps.children) ===
        (this.props.routes || this.props.children),
      'You cannot change <Router routes>; it will be ignored'
    )
  },

  componentWillUnmount() {
    if (this._unlisten)
      this._unlisten()
  },

  componentDidUpdate(previousProps) {
    const { routes, children } = this.props

    const newRoutes = createRoutes(routes || children)
    const prevRoutes = createRoutes(previousProps.routes || previousProps.children)

    if (JSON.stringify(prevRoutes) === JSON.stringify(newRoutes)) {
      return
    }
    this.transitionManager.setRoutes(newRoutes, (error, state) => {
      if (error) {
        this.handleError(error)
      } else {
        // Keep the identity of this.router because of a caveat in ContextUtils:
        // they only work if the object identity is preserved.

        if (JSON.stringify(this.state.routes) !== JSON.stringify(state.routes)) {
          const hasChanged = this.state.components.toString() !== state.components.toString()
          const newState = { ...this.state, routes: state.routes }

          if (hasChanged) {
            newState.components = state.components
          }

          assignRouterState(this.router, newState)
          this.setState(newState)
        }
      }
    })
  },

  render() {
    const { location, routes, params, components } = this.state
    const { createElement, render, ...props } = this.props

    if (location == null)
      return null // Async match

    // Only forward non-Router-specific props to routing context, as those are
    // the only ones that might be custom routing context props.
    Object.keys(propTypes).forEach(propType => delete props[propType])

    return render({
      ...props,
      router: this.router,
      location,
      routes,
      params,
      components,
      createElement
    })
  }

})

if (prefixUnsafeLifecycleMethods) {
  Router.prototype.UNSAFE_componentWillReceiveProps = Router.prototype.componentWillReceiveProps
  Router.prototype.UNSAFE_componentWillMount = Router.prototype.componentWillMount
  delete Router.prototype.componentWillReceiveProps
  delete Router.prototype.componentWillMount
}

export default Router
