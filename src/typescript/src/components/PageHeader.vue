<script lang="ts">
export { default } from "@/components/PageHeader";
</script>

<template>
	<div class="page-header"
		v-global:view_location_options='view_location_options'
	>
		<div class="page-header-title">
			<h1 class="page-title">Bruplint</h1>
		</div>
		<table class="page-header-login">
			<tbody>
				<tr>
					<td style="text-align: right;">
						<span v-if='loggedIn'>Logged in as: {{ current_user.username }}</span>
						<span v-else>Not logged in</span>
					</td>
				</tr>
				<tr>
					<td style="text-align: right;">
						<template v-if='loggedIn'>
							<button @click='getViews()'>My Views</button>
							<button @click='logOut()'>Log Out</button>
						</template>
						<template v-else>
							<button @click='createUser()'>Create User</button>
							<button @click='attemptLogIn()'>{{ loggedIn ? "Change User" : "Log In" }}</button>
						</template>
					</td>
				</tr>
			</tbody>
		</table>
		<table class="page-header-inputs">
			<tbody>
				<tr>
					<td style="text-align: center;">
						<input id="page-header-hostname"
							ref="input_hostname"
							placeholder="hostname"
							:class='hostnameTag'
							@input='resize($event.target)'
							@change='checkCurrentHostnameStatus()'
							v-model='view_location_options.hostname'
						/>
						<span><b>/view/</b></span>
						<input id="page-header-username"
							ref="input_username"
							placeholder="username"
							@input='resize($event.target)'
							v-model='view_location_options.username'
						/>
						<span><b>/</b></span>
						<input id="page-header-series-name"
							ref="input_series_name"
							placeholder="display_name"
							@input='resize($event.target)'
							v-model='view_location_options.series_name'
						/>
					</td>
				</tr>
				<tr>
					<td>
						<button @click='requestSave()' :disabled='view_location_options.active_graph === null || !loggedIn'>Save</button>
						<button @click='requestLoad()' :disabled='current_hostname_valid !== true'>Load</button>
						<button @click='requestUpload()'>Upload</button>
						<button @click='requestDownload()' :disabled='view_location_options.active_graph === null'>Download</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style>
.page-header {
	background-color: royalblue;
	height: 100%;
	width: 100%;
}

.page-header * {
	color: white;
}

.page-header button,
.page-header input,
.page-header span {
	font-size: 1.5rem;
	margin: 2px;
}

.page-header-title {
	float: left;
	width: 25%;
}

.page-header-inputs {
	float: right;
	height: 100%;
	text-align: center;
	width: 50%;
}

.page-header-inputs button:disabled {
	color: rgba(255, 255, 255, 0.3);
}

.page-header-login {
	float: right;
	height: 100%;
	text-align: center;
	width: 25%;
}

.page-title {
	color: white;
	font-size: 3rem;
	margin: 10px;
}

.hostname-invalid {
	background-color: rgba(255, 127, 127, 0.5);
}

.hostname-valid {
	background-color: rgba(127, 255, 127, 0.5);
}
</style>
